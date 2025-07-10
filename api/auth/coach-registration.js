// api/coach-registration.js - KOMPLETTER CODE MIT DASHBOARD REDIRECT FIX
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log('🚀 Registration API called');
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('⚡ OPTIONS request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📝 Processing registration data...');
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      company, 
      experience, 
      specialization, 
      goals, 
      challenges 
    } = req.body;

    console.log('📧 Email to register:', email);

    // Validierung
    if (!firstName || !lastName || !email) {
      console.log('❌ Validation failed');
      return res.status(400).json({ 
        error: 'Vorname, Nachname und Email sind erforderlich' 
      });
    }

    // Email-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      return res.status(400).json({ 
        error: 'Bitte geben Sie eine gültige Email-Adresse ein' 
      });
    }

    console.log('✅ Validation passed');

    // Prüfen ob Email bereits existiert
    console.log('🔍 Checking if email exists...');
    const { data: existingCoach } = await supabase
      .from('coaches')
      .select('email')
      .eq('email', email)
      .single();

    if (existingCoach) {
      console.log('❌ Email already exists');
      return res.status(409).json({ 
        error: 'Ein Coach mit dieser Email-Adresse existiert bereits' 
      });
    }

    console.log('✅ Email is unique');

    // Coach in Datenbank erstellen
    console.log('💾 Creating coach in database...');
    const { data: newCoach, error: dbError } = await supabase
      .from('coaches')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          company: company || null,
          experience: experience || null,
          specialization: specialization || null,
          goals: goals || null,
          challenges: challenges || null,
          created_at: new Date().toISOString(),
          status: 'active',
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return res.status(500).json({ 
        error: 'Registrierung fehlgeschlagen',
        details: dbError.message 
      });
    }

    console.log('✅ Coach created successfully:', newCoach.id);

    // EMAIL SENDING LOGIC - AUSFÜHRLICHE LOGS
    console.log('📧 STARTING EMAIL PROCESS...');
    console.log('📧 Target email:', email);
    console.log('📧 First name:', firstName);
    console.log('📧 Last name:', lastName);

    let emailSent = false;
    try {
      const emailApiUrl = `${req.headers.origin || 'https://coaching-cockpit-live-v2.vercel.app'}/api/send-welcome-email`;
      console.log('📧 Email API URL:', emailApiUrl);

      const emailPayload = {
        email: email,
        firstName: firstName,
        lastName: lastName
      };
      console.log('📧 Email payload:', JSON.stringify(emailPayload));

      console.log('📧 Making fetch request...');
      const emailResponse = await fetch(emailApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });

      console.log('📧 Email API response status:', emailResponse.status);
      
      const emailResult = await emailResponse.json();
      console.log('📧 Email API response body:', JSON.stringify(emailResult));

      if (!emailResponse.ok) {
        console.error('❌ Email API failed:', emailResult);
      } else {
        console.log('✅ Email API succeeded - EMAIL SENT!');
        emailSent = true;
      }

    } catch (emailError) {
      console.error('❌ Email fetch error:', emailError);
      console.error('❌ Error details:', emailError.message);
    }

    console.log('📧 EMAIL PROCESS COMPLETE');
    
    console.log('🎯 Sending response to client...');
    
    // KORREKTES RESPONSE FORMAT MIT DASHBOARD REDIRECT + COACH ID
    return res.status(201).json({ 
      success: true, 
      message: emailSent ? 
        'Registrierung erfolgreich! Prüfen Sie Ihr Email-Postfach.' : 
        'Registrierung erfolgreich! Email wird nachgeliefert.',
      data: {
        id: newCoach.id,
        firstName: newCoach.first_name,
        lastName: newCoach.last_name,
        email: newCoach.email,
        trialEnd: newCoach.trial_end,
        emailSent: emailSent
      },
      // WICHTIG: Dashboard Redirect mit Coach ID in URL (KORRIGIERTE URL)
      redirectUrl: `/coach-dashboard.html?coachId=${newCoach.id}&email=${encodeURIComponent(newCoach.email)}&firstName=${encodeURIComponent(newCoach.first_name)}`
    });

  } catch (error) {
    console.error('❌ MAIN ERROR:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Ein unerwarteter Fehler ist aufgetreten',
      details: error.message 
    });
  }
}