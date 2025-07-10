// ERSETZE den Inhalt von api/trial-management.js mit diesem Code:
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Wichtig: SERVICE_ROLE für Schreibzugriff
);

export default async function handler(req, res) {
  console.log('🎯 Trial Management API called:', req.method);
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Get trial status - SUCHT IN COACHES TABELLE
    const { coachId } = req.query;
    
    if (!coachId) {
      return res.status(400).json({ success: false, error: 'coachId required' });
    }

    try {
      console.log('🔍 Looking for coach in coaches table:', coachId);
      
      // WICHTIG: Suche in coaches Tabelle, nicht coach_trials!
      const { data: coach, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', coachId)
        .single();

      if (error) {
        console.error('❌ Coach not found:', error);
        return res.status(404).json({ 
          success: false, 
          error: 'Coach not found',
          debug: error.message 
        });
      }

      console.log('✅ Coach found:', coach.email);

      // Calculate trial status from coaches table
      const now = new Date();
      const trialStart = new Date(coach.trial_start);
      const trialEnd = new Date(coach.trial_end);
      
      const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
      const isActive = now >= trialStart && now <= trialEnd && daysLeft > 0;
      
      // Determine status
      let status;
      if (coach.status === 'paid' || coach.plan === 'paid') {
        status = 'paid';
      } else if (isActive) {
        status = 'active';
      } else {
        status = 'expired';
      }

      const trialData = {
        id: coach.id,
        coach_id: coach.id,
        email: coach.email,
        trial_start: coach.trial_start,
        trial_end: coach.trial_end,
        status: status,
        days_left: daysLeft,
        is_expired: !isActive && status !== 'paid',
        is_active: isActive || status === 'paid',
        created_at: coach.created_at || coach.trial_start,
        // Zusätzliche Coach-Daten
        coach_data: {
          firstName: coach.first_name,
          lastName: coach.last_name,
          email: coach.email,
          company: coach.company
        }
      };

      console.log('✅ Returning trial data:', {
        status,
        daysLeft,
        isActive,
        trialEnd: coach.trial_end
      });

      return res.json({ 
        success: true, 
        trial: trialData,
        message: `Trial ${status} - ${daysLeft} days left`
      });

    } catch (error) {
      console.error('❌ Trial fetch error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch trial',
        debug: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    // Create new trial - ERSTELLT IN COACHES TABELLE
    const { coachId, email, name, company } = req.body;
    
    if (!coachId || !email || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'coachId, email, and name are required' 
      });
    }

    try {
      console.log('🆕 Creating trial for:', { coachId, email, name });

      // Check if coach already exists
      const { data: existingCoach } = await supabase
        .from('coaches')
        .select('id')
        .eq('id', coachId)
        .single();

      if (existingCoach) {
        console.log('✅ Coach already exists, returning existing trial');
        // Return existing trial data
        return handler({ method: 'GET', query: { coachId } }, res);
      }

      // Create new coach with trial
      const trialStart = new Date();
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const coachData = {
        id: coachId,
        email: email,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
        company: company || null,
        status: 'active',
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
        created_at: new Date().toISOString()
      };

      console.log('📝 Inserting coach data:', coachData);

      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .insert(coachData)
        .select()
        .single();

      if (coachError) {
        console.error('❌ Coach creation error:', coachError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create coach',
          debug: coachError.message
        });
      }

      console.log('✅ Coach created successfully');

      // Send welcome email
      try {
        const emailResponse = await fetch(`${req.headers.origin || 'https://' + req.headers.host}/api/emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_welcome',
            coachId: coachId,
            email: email,
            data: { name: name, company: company || '' }
          })
        });

        const emailResult = await emailResponse.json();
        console.log('📧 Email result:', emailResult.success ? 'Sent' : 'Failed');

      } catch (emailError) {
        console.error('⚠️ Email error:', emailError);
      }

      // Return trial data in expected format
      const trialData = {
        id: coach.id,
        coach_id: coach.id,
        email: coach.email,
        trial_start: coach.trial_start,
        trial_end: coach.trial_end,
        status: 'active',
        days_left: 14,
        is_expired: false,
        is_active: true,
        created_at: coach.created_at,
        coach_data: {
          firstName: coach.first_name,
          lastName: coach.last_name,
          email: coach.email,
          company: coach.company
        }
      };

      return res.json({ 
        success: true, 
        trial: trialData,
        message: 'Trial started successfully!'
      });

    } catch (error) {
      console.error('❌ Unexpected error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        debug: error.message
      });
    }
  }

  if (req.method === 'PUT') {
    // Update trial (convert to paid)
    const { coachId, action } = req.body;
    
    if (!coachId || !action) {
      return res.status(400).json({ 
        success: false,
        error: 'coachId and action required' 
      });
    }

    if (action === 'convert_to_paid') {
      try {
        console.log('💎 Converting trial to paid for:', coachId);
        
        const { data: updatedCoach, error: updateError } = await supabase
          .from('coaches')
          .update({ 
            status: 'paid',
            plan: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', coachId)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Update error:', updateError);
          return res.status(500).json({ 
            success: false,
            error: 'Failed to update trial',
            debug: updateError.message 
          });
        }

        console.log('✅ Trial converted to paid successfully');

        const trialData = {
          id: updatedCoach.id,
          coach_id: updatedCoach.id,
          email: updatedCoach.email,
          trial_start: updatedCoach.trial_start,
          trial_end: updatedCoach.trial_end,
          status: 'paid',
          days_left: 0,
          is_expired: false,
          is_active: true,
          created_at: updatedCoach.created_at,
          coach_data: {
            firstName: updatedCoach.first_name,
            lastName: updatedCoach.last_name,
            email: updatedCoach.email,
            company: updatedCoach.company
          }
        };

        return res.json({ 
          success: true, 
          trial: trialData,
          message: 'Trial converted to paid successfully'
        });

      } catch (error) {
        console.error('❌ Conversion error:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to convert trial',
          debug: error.message 
        });
      }
    }

    return res.status(400).json({ 
      success: false,
      error: 'Unknown action' 
    });
  }

  return res.status(405).json({ 
    success: false, 
    error: 'Method not allowed' 
  });
}