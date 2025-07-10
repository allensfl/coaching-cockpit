// /api/coach-trial-signup.js
// Erstellt Coach + Trial + sendet Email in einem Schritt

// Alte Zeilen 4-9 löschen und ersetzen mit:
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, company } = req.body;

    if (!email || !name) {
      return res.status(400).json({ 
        error: 'Email and name are required' 
      });
    }

    console.log('Starting coach-trial signup for:', email);

    // SCHRITT 1: Erstelle neuen Coach
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .insert({
        email: email,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
        name: name,
        specialization: 'General Coaching',
        experience: 'Trial User',
        status: 'active',
        subscription_status: 'trial',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (coachError) {
      console.error('Coach creation failed:', coachError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create coach',
        debug: coachError
      });
    }

    console.log('Coach created successfully:', coach.id);

    // SCHRITT 2: Erstelle Trial für diesen Coach
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialStart.getDate() + 14);

    const { data: trial, error: trialError } = await supabase
      .from('coach_trials')
      .insert({
        coach_id: coach.id,
        email: email,
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
        status: 'active',
        clients_created: 0,
        sessions_conducted: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (trialError) {
      console.error('Trial creation failed:', trialError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create trial',
        debug: trialError
      });
    }

    console.log('Trial created successfully:', trial.id);

    // SCHRITT 3: Sende Welcome Email
    try {
      const emailResponse = await fetch(`${req.headers.origin}/api/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_welcome',
          coachId: coach.id,
          email: email,
          data: {
            name: name,
            company: company || 'Ihr Unternehmen'
          }
        })
      });

      const emailResult = await emailResponse.json();
      
      console.log('Email API response:', emailResult);

      return res.status(200).json({
        success: true,
        coach: coach,
        trial: trial,
        email_sent: emailResult.success || false,
        message: 'Coach and trial created successfully!',
        debug: {
          coach_created: 'OK',
          trial_created: 'OK',
          email_result: emailResult
        }
      });

    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // Trial wurde erstellt, auch wenn Email fehlschlägt
      return res.status(200).json({
        success: true,
        coach: coach,
        trial: trial,
        email_sent: false,
        message: 'Coach and trial created, but email failed',
        debug: {
          coach_created: 'OK',
          trial_created: 'OK',
          email_error: emailError.message
        }
      });
    }

  } catch (error) {
    console.error('Signup process failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      debug: error.message
    });
  }
}