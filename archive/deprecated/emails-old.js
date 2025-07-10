// Email API with SendGrid (Alternative to Resend)
// File: /api/emails.js

import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { action, email, data, coachId } = req.body;

    if (!email || !action) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and action are required' 
      });
    }

    let emailContent = {};

    // Email Templates
    switch (action) {
      case 'send_welcome':
        emailContent = {
          to: email,
          from: 'coaching@ki-online.coach',
          subject: 'Willkommen bei Ki-Online.Coach! 🚀 Dein 14-Tage Trial startet jetzt',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2196F3;">Willkommen ${data.name || 'Coach'}!</h1>
              
              <p>Fantastisch! Dein 14-tägiger Trial bei Ki-Online.Coach hat gerade begonnen! 🎉</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Dein Trial im Überblick:</h3>
                <ul>
                  <li>✅ <strong>Startdatum:</strong> ${data.trial_start_date || 'Heute'}</li>
                  <li>✅ <strong>Enddatum:</strong> ${data.trial_end_date || 'In 14 Tagen'}</li>
                  <li>✅ <strong>Status:</strong> Aktiv und bereit!</li>
                </ul>
              </div>
              
              <h3>Was du jetzt tun kannst:</h3>
              <ul>
                <li>🎯 Dashboard erkunden</li>
                <li>📊 Analytics einrichten</li>
                <li>👥 Erste Clients hinzufügen</li>
                <li>📈 Coaching-Sessions planen</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://ki-online.coach/coach-dashboard.html" 
                   style="background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                  🚀 Jetzt Dashboard öffnen
                </a>
              </div>
              
              <p>Bei Fragen bin ich für dich da! Antworte einfach auf diese Email.</p>
              
              <p>Viel Erfolg mit deinem Trial!</p>
              <p><strong>Dein Ki-Online.Coach Team</strong></p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #666;">
                Diese Email wurde automatisch gesendet, weil du einen Trial bei Ki-Online.Coach gestartet hast.
              </p>
            </div>
          `,
          text: `Willkommen ${data.name || 'Coach'}!
          
Dein 14-tägiger Trial bei Ki-Online.Coach hat begonnen!

Trial Details:
- Startdatum: ${data.trial_start_date || 'Heute'}
- Enddatum: ${data.trial_end_date || 'In 14 Tagen'}
- Status: Aktiv

Nächste Schritte:
- Dashboard erkunden
- Analytics einrichten  
- Erste Clients hinzufügen
- Coaching-Sessions planen

Dashboard öffnen: https://ki-online.coach/coach-dashboard.html

Bei Fragen antworte einfach auf diese Email.

Dein Ki-Online.Coach Team`
        };
        break;

      case 'send_day1_tips':
        emailContent = {
          to: email,
          from: 'coaching@ki-online.coach',
          subject: 'Tag 1: Deine ersten Schritte im Ki-Online.Coach 🎯',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2196F3;">Tag 1: Perfekter Start! 🎯</h1>
              
              <p>Hallo ${data.name || 'Coach'},</p>
              
              <p>wie läuft dein erster Tag mit Ki-Online.Coach? Hier sind 3 Power-Tipps für den perfekten Start:</p>
              
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>🥇 Quick-Win Tipp:</h3>
                <p>Lade heute noch deinen ersten Client ein! Das dauert nur 2 Minuten und zeigt dir sofort den Wert des Systems.</p>
              </div>
              
              <p><strong>Dein Ki-Online.Coach Team</strong></p>
            </div>
          `
        };
        break;

      case 'send_checkin':
        emailContent = {
          to: email,
          from: 'coaching@ki-online.coach',
          subject: 'Tag 3: Wie läuft dein Trial? 💪',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2196F3;">Halbzeit-Check! 💪</h1>
              
              <p>Hallo ${data.name || 'Coach'},</p>
              
              <p>3 Tage sind um - wie gefällt dir Ki-Online.Coach bis jetzt?</p>
              
              <p>Falls du Fragen hast, antworte einfach auf diese Email!</p>
              
              <p><strong>Dein Ki-Online.Coach Team</strong></p>
            </div>
          `
        };
        break;

      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Unknown email action' 
        });
    }

    // Send email with SendGrid
    console.log('Sending email via SendGrid:', { to: email, subject: emailContent.subject });
    
    const result = await sgMail.send(emailContent);
    
    console.log('SendGrid response:', result[0].statusCode);

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully via SendGrid',
      recipient: email,
      provider: 'SendGrid',
      statusCode: result[0].statusCode
    });

  } catch (error) {
    console.error('SendGrid email error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send email',
      provider: 'SendGrid',
      details: error.message
    });
  }
}