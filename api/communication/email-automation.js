// Email Automation API - Resend Integration
// File: /api/email-automation.js


export const config = {
  api: {
    externalResolver: true,
  },
}


import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const { action, coachId, email, data } = req.body;

      switch (action) {
        case 'send_welcome':
          return await sendWelcomeEmail(req, res, coachId, email, data);
        
        case 'send_trial_sequence':
          return await sendTrialSequenceEmail(req, res, coachId, email, data);
        
        case 'send_conversion':
          return await sendConversionEmail(req, res, coachId, email, data);
        
        case 'schedule_sequence':
          return await scheduleEmailSequence(req, res, coachId, email, data);
        
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Use: send_welcome, send_trial_sequence, send_conversion, schedule_sequence'
          });
      }
    }

    if (req.method === 'GET') {
      const { type, coachId } = req.query;

      if (type === 'status') {
        return await getEmailStatus(req, res, coachId);
      }

      if (type === 'templates') {
        return await getEmailTemplates(req, res);
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid type. Use: status, templates'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Email Automation API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Welcome Email Function
async function sendWelcomeEmail(req, res, coachId, email, data = {}) {
  try {
    const coachName = data.name || 'Coach';
    const trialDays = data.trialDays || 14;

    const emailResult = await resend.emails.send({
      from: 'coaching@ki-online.coach',
      to: email,
      subject: `Willkommen bei Ki-Online.Coach! 🚀 Dein ${trialDays}-Tage Trial startet jetzt`,
      html: generateWelcomeEmailHTML(coachName, trialDays, data),
      text: generateWelcomeEmailText(coachName, trialDays)
    });

    // Log email to database
    await logEmailToDatabase({
      coach_id: coachId,
      email_type: 'welcome',
      recipient: email,
      resend_id: emailResult.data?.id,
      status: 'sent',
      subject: `Willkommen bei Ki-Online.Coach! 🚀`,
      sent_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully',
      email_id: emailResult.data?.id,
      recipient: email
    });

  } catch (error) {
    console.error('Welcome Email Error:', error);
    
    // Log failed email
    await logEmailToDatabase({
      coach_id: coachId,
      email_type: 'welcome',
      recipient: email,
      status: 'failed',
      error_message: error.message,
      sent_at: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to send welcome email',
      details: error.message
    });
  }
}

// Trial Sequence Email Function
async function sendTrialSequenceEmail(req, res, coachId, email, data = {}) {
  try {
    const { day, coachName = 'Coach', trialDaysLeft } = data;
    
    const emailTemplates = {
      1: {
        subject: '🎯 Tag 1: Dein Ki-Online.Coach Setup Guide',
        template: 'day1_setup'
      },
      3: {
        subject: '💡 Tag 3: Wie läuft dein Trial? Hier sind Pro-Tipps!',
        template: 'day3_checkin'
      },
      7: {
        subject: '⚡ Halbzeit! Noch 7 Tage - Entdecke Advanced Features',
        template: 'day7_features'
      },
      10: {
        subject: '⏰ Noch 4 Tage: Zeit für dein Upgrade!',
        template: 'day10_upgrade'
      },
      12: {
        subject: '🚨 Nur noch 2 Tage! Upgrade jetzt und spare 20%',
        template: 'day12_urgency'
      },
      14: {
        subject: '🔥 Letzter Tag! Upgrade in 2 Klicks',
        template: 'day14_final'
      }
    };

    const emailConfig = emailTemplates[day];
    if (!emailConfig) {
      return res.status(400).json({
        success: false,
        error: `No email template for day ${day}`
      });
    }

    const emailResult = await resend.emails.send({
      from: 'coaching@ki-online.coach',
      to: email,
      subject: emailConfig.subject,
      html: generateTrialSequenceHTML(day, coachName, trialDaysLeft, emailConfig.template),
      text: generateTrialSequenceText(day, coachName, trialDaysLeft)
    });

    // Log email to database
    await logEmailToDatabase({
      coach_id: coachId,
      email_type: `trial_day_${day}`,
      recipient: email,
      resend_id: emailResult.data?.id,
      status: 'sent',
      subject: emailConfig.subject,
      sent_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Day ${day} trial email sent successfully`,
      email_id: emailResult.data?.id,
      day: day
    });

  } catch (error) {
    console.error('Trial Sequence Email Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send trial sequence email',
      details: error.message
    });
  }
}

// Conversion Email Function
async function sendConversionEmail(req, res, coachId, email, data = {}) {
  try {
    const { type = 'upgrade_success', coachName = 'Coach' } = data;

    const conversionTemplates = {
      upgrade_success: {
        subject: '🎉 Welcome to Premium! Alle Features sind jetzt freigeschaltet',
        template: 'upgrade_success'
      },
      trial_expired: {
        subject: '⏰ Dein Trial ist abgelaufen - Reaktiviere in 2 Klicks',
        template: 'trial_expired'
      },
      reactivation: {
        subject: '🚀 Willkommen zurück! Dein Account ist wieder aktiv',
        template: 'reactivation'
      }
    };

    const emailConfig = conversionTemplates[type];
    if (!emailConfig) {
      return res.status(400).json({
        success: false,
        error: `Invalid conversion email type: ${type}`
      });
    }

    const emailResult = await resend.emails.send({
      from: 'coaching@ki-online.coach',
      to: email,
      subject: emailConfig.subject,
      html: generateConversionEmailHTML(type, coachName, emailConfig.template),
      text: generateConversionEmailText(type, coachName)
    });

    // Log email to database
    await logEmailToDatabase({
      coach_id: coachId,
      email_type: `conversion_${type}`,
      recipient: email,
      resend_id: emailResult.data?.id,
      status: 'sent',
      subject: emailConfig.subject,
      sent_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `${type} email sent successfully`,
      email_id: emailResult.data?.id,
      type: type
    });

  } catch (error) {
    console.error('Conversion Email Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send conversion email',
      details: error.message
    });
  }
}

// Schedule Email Sequence Function
async function scheduleEmailSequence(req, res, coachId, email, data = {}) {
  try {
    const { coachName = 'Coach', trialStartDate } = data;
    const startDate = new Date(trialStartDate || new Date());

    // Calculate send dates for email sequence
    const emailSchedule = [
      { day: 1, sendDate: new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000) },
      { day: 3, sendDate: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000) },
      { day: 7, sendDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) },
      { day: 10, sendDate: new Date(startDate.getTime() + 10 * 24 * 60 * 60 * 1000) },
      { day: 12, sendDate: new Date(startDate.getTime() + 12 * 24 * 60 * 60 * 1000) },
      { day: 14, sendDate: new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000) }
    ];

    // Store scheduled emails in database
    for (const schedule of emailSchedule) {
      await supabase
        .from('email_queue')
        .insert({
          coach_id: coachId,
          recipient: email,
          email_type: `trial_day_${schedule.day}`,
          scheduled_for: schedule.sendDate.toISOString(),
          status: 'scheduled',
          data: {
            coachName: coachName,
            day: schedule.day,
            trialDaysLeft: 14 - schedule.day
          },
          created_at: new Date().toISOString()
        });
    }

    return res.status(200).json({
      success: true,
      message: 'Email sequence scheduled successfully',
      scheduled_emails: emailSchedule.length,
      start_date: startDate.toISOString(),
      schedule: emailSchedule.map(s => ({
        day: s.day,
        send_date: s.sendDate.toISOString()
      }))
    });

  } catch (error) {
    console.error('Schedule Email Sequence Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to schedule email sequence',
      details: error.message
    });
  }
}

// Get Email Status Function
async function getEmailStatus(req, res, coachId) {
  try {
    const { data: emailLogs, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      email_count: emailLogs.length,
      emails: emailLogs
    });

  } catch (error) {
    console.error('Get Email Status Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get email status',
      details: error.message
    });
  }
}

// Get Email Templates Function
async function getEmailTemplates(req, res) {
  try {
    const templates = {
      welcome: 'Welcome email for new trial users',
      day1_setup: 'Setup guide for day 1',
      day3_checkin: 'Check-in email for day 3',
      day7_features: 'Feature showcase for day 7',
      day10_upgrade: 'Upgrade reminder for day 10',
      day12_urgency: 'Urgent upgrade for day 12',
      day14_final: 'Final upgrade chance for day 14',
      upgrade_success: 'Successful upgrade confirmation',
      trial_expired: 'Trial expiration notice',
      reactivation: 'Account reactivation confirmation'
    };

    return res.status(200).json({
      success: true,
      templates: templates
    });

  } catch (error) {
    console.error('Get Email Templates Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get email templates',
      details: error.message
    });
  }
}

// Helper function to log emails to database
async function logEmailToDatabase(emailData) {
  try {
    const { error } = await supabase
      .from('email_queue')
      .insert(emailData);

    if (error) {
      console.error('Failed to log email to database:', error);
    }
  } catch (error) {
    console.error('Database logging error:', error);
  }
}

// HTML Email Template Functions
function generateWelcomeEmailHTML(coachName, trialDays, data = {}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Willkommen bei Ki-Online.Coach</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .highlight { background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Willkommen bei Ki-Online.Coach!</h1>
          <p>Hallo ${coachName}, dein ${trialDays}-Tage Trial startet jetzt!</p>
        </div>
        
        <div class="content">
          <h2>Herzlich willkommen in der Zukunft des Coachings! 🎯</h2>
          
          <p>Du hast gerade den ersten Schritt zu einem professionelleren Coaching-Business gemacht. Ich freue mich riesig, dich bei Ki-Online.Coach begrüßen zu dürfen!</p>
          
          <div class="highlight">
            <h3>🎁 Was du in den nächsten ${trialDays} Tagen bekommst:</h3>
            <ul>
              <li>✅ Professionelles Coach Dashboard</li>
              <li>✅ Client Management System</li>
              <li>✅ Analytics & Insights</li>
              <li>✅ Email Automation</li>
              <li>✅ Premium Support</li>
            </ul>
          </div>
          
          <h3>🚀 Deine nächsten Schritte:</h3>
          <ol>
            <li><strong>Dashboard erkunden:</strong> Schaue dich in Ruhe um</li>
            <li><strong>Ersten Client anlegen:</strong> Teste das System</li>
            <li><strong>Features ausprobieren:</strong> Entdecke alle Möglichkeiten</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ki-online.coach/coach-dashboard.html" class="button">
              🎯 Zum Dashboard
            </a>
          </div>
          
          <p><strong>Fragen oder Probleme?</strong><br>
          Antworte einfach auf diese Email oder schreibe an support@ki-online.coach</p>
          
          <p>Viel Erfolg mit deinem Trial!<br>
          <strong>Dein Ki-Online.Coach Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© 2025 Ki-Online.Coach | Made with ❤️ for Coaches</p>
          <p>Du erhältst diese Email, weil du dich für einen Trial angemeldet hast.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateWelcomeEmailText(coachName, trialDays) {
  return `
    Willkommen bei Ki-Online.Coach!
    
    Hallo ${coachName},
    
    dein ${trialDays}-Tage Trial startet jetzt!
    
    Du hast gerade den ersten Schritt zu einem professionelleren Coaching-Business gemacht.
    
    Was du in den nächsten ${trialDays} Tagen bekommst:
    - Professionelles Coach Dashboard
    - Client Management System  
    - Analytics & Insights
    - Email Automation
    - Premium Support
    
    Deine nächsten Schritte:
    1. Dashboard erkunden: https://ki-online.coach/coach-dashboard.html
    2. Ersten Client anlegen
    3. Features ausprobieren
    
    Fragen? Antworte auf diese Email oder schreibe an support@ki-online.coach
    
    Viel Erfolg mit deinem Trial!
    Dein Ki-Online.Coach Team
  `;
}

function generateTrialSequenceHTML(day, coachName, trialDaysLeft, template) {
  const templates = {
    day1_setup: `
      <h2>🎯 Tag 1: Dein Setup Guide</h2>
      <p>Hallo ${coachName}!</p>
      <p>Willkommen zu Tag 1 deines Trials! Hier ist dein Schnellstart-Guide:</p>
      <ul>
        <li>✅ Dashboard personalisieren</li>
        <li>✅ Ersten Client anlegen</li>
        <li>✅ Email-Einstellungen konfigurieren</li>
      </ul>
    `,
    day3_checkin: `
      <h2>💡 Tag 3: Wie läuft's?</h2>
      <p>Hi ${coachName}!</p>
      <p>Du bist jetzt 3 Tage dabei - wie gefällt dir Ki-Online.Coach bisher?</p>
      <p>Hier sind einige Pro-Tipps für maximalen Erfolg:</p>
    `,
    day7_features: `
      <h2>⚡ Halbzeit erreicht!</h2>
      <p>Hey ${coachName}!</p>
      <p>Du hast bereits die Hälfte deines Trials geschafft! Noch ${trialDaysLeft} Tage.</p>
      <p>Zeit, die Advanced Features zu entdecken:</p>
    `,
    day10_upgrade: `
      <h2>⏰ Nur noch ${trialDaysLeft} Tage!</h2>
      <p>Lieber ${coachName},</p>
      <p>dein Trial neigt sich dem Ende zu. Zeit, über dein Upgrade nachzudenken!</p>
    `,
    day12_urgency: `
      <h2>🚨 Nur noch 2 Tage!</h2>
      <p>${coachName}, dein Trial läuft bald ab!</p>
      <p>Sichere dir jetzt 20% Rabatt auf dein Premium Upgrade!</p>
    `,
    day14_final: `
      <h2>🔥 Letzter Tag!</h2>
      <p>Hallo ${coachName},</p>
      <p>heute ist dein letzter Trial-Tag. Upgrade jetzt in nur 2 Klicks!</p>
    `
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${templates[template] || `<h2>Tag ${day} Update</h2><p>Hallo ${coachName}!</p>`}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://ki-online.coach/coach-dashboard.html" class="button">
            🎯 Zum Dashboard
          </a>
        </div>
        
        <p>Bei Fragen antworte einfach auf diese Email!</p>
        <p>Dein Ki-Online.Coach Team</p>
      </div>
    </body>
    </html>
  `;
}

function generateTrialSequenceText(day, coachName, trialDaysLeft) {
  return `
    Tag ${day} Update - Ki-Online.Coach
    
    Hallo ${coachName}!
    
    Noch ${trialDaysLeft} Tage in deinem Trial.
    
    Dashboard: https://ki-online.coach/coach-dashboard.html
    
    Bei Fragen antworte auf diese Email!
    
    Dein Ki-Online.Coach Team
  `;
}

function generateConversionEmailHTML(type, coachName, template) {
  const templates = {
    upgrade_success: `
      <h2>🎉 Welcome to Premium!</h2>
      <p>Hallo ${coachName}!</p>
      <p>Herzlichen Glückwunsch! Du bist jetzt Premium-Mitglied bei Ki-Online.Coach!</p>
      <p>Alle Features sind für dich freigeschaltet:</p>
      <ul>
        <li>✅ Unbegrenzte Clients</li>
        <li>✅ Advanced Analytics</li>
        <li>✅ File Upload</li>
        <li>✅ Calendar Integration</li>
        <li>✅ Priority Support</li>
      </ul>
    `,
    trial_expired: `
      <h2>⏰ Dein Trial ist abgelaufen</h2>
      <p>Hallo ${coachName}!</p>
      <p>Dein 14-Tage Trial ist gestern abgelaufen, aber keine Sorge - du kannst jederzeit upgraden!</p>
      <p>Reaktiviere deinen Account in nur 2 Klicks:</p>
    `,
    reactivation: `
      <h2>🚀 Willkommen zurück!</h2>
      <p>Hey ${coachName}!</p>
      <p>Schön, dass du wieder da bist! Dein Account ist wieder vollständig aktiv.</p>
    `
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${templates[template] || `<h2>Update</h2><p>Hallo ${coachName}!</p>`}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://ki-online.coach/coach-dashboard.html" class="button">
            🎯 Zum Dashboard
          </a>
        </div>
        
        <p>Dein Ki-Online.Coach Team</p>
      </div>
    </body>
    </html>
  `;
}

function generateConversionEmailText(type, coachName) {
  const texts = {
    upgrade_success: `
      Welcome to Premium! - Ki-Online.Coach
      
      Hallo ${coachName}!
      
      Herzlichen Glückwunsch! Du bist jetzt Premium-Mitglied!
      
      Alle Features sind freigeschaltet:
      - Unbegrenzte Clients
      - Advanced Analytics  
      - File Upload
      - Calendar Integration
      - Priority Support
    `,
    trial_expired: `
      Trial abgelaufen - Ki-Online.Coach
      
      Hallo ${coachName}!
      
      Dein Trial ist abgelaufen, aber du kannst jederzeit upgraden!
      
      Reaktiviere: https://ki-online.coach/upgrade
    `,
    reactivation: `
      Willkommen zurück! - Ki-Online.Coach
      
      Hey ${coachName}!
      
      Schön, dass du wieder da bist! Dein Account ist aktiv.
    `
  };

  return texts[type] || `Update von Ki-Online.Coach\n\nHallo ${coachName}!\n\nDein Ki-Online.Coach Team`;
}