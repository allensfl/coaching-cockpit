// api/send-welcome-email.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, lastName } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({ error: 'Email und Vorname sind erforderlich' });
    }

    // Welcome Email senden
    const emailData = await resend.emails.send({
      from: 'Coaching Cockpit <welcome@coaching-cockpit.de>', // Deine Domain
      to: [email],
      subject: '🎉 Willkommen im Coaching Cockpit!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px 10px 0 0;
            }
            .content { 
              background: white; 
              padding: 30px; 
              border: 1px solid #e0e0e0; 
              border-radius: 0 0 10px 10px;
            }
            .cta-button { 
              display: inline-block; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 25px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .highlight { 
              background: #f8f9ff; 
              padding: 20px; 
              border-left: 4px solid #667eea; 
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎯 Coaching Cockpit</h1>
            <p>Ihr KI-gestütztes Ruhestandscoaching-System</p>
          </div>
          
          <div class="content">
            <h2>Hallo ${firstName}! 👋</h2>
            
            <p>Herzlich willkommen im <strong>Coaching Cockpit</strong>! Sie haben sich erfolgreich als Coach registriert.</p>
            
            <div class="highlight">
              <h3>🚀 Ihre nächsten Schritte:</h3>
              <ol>
                <li><strong>Dashboard erkunden</strong> - Lernen Sie Ihr neues Cockpit kennen</li>
                <li><strong>Ersten Klienten einladen</strong> - Starten Sie mit dem Coaching</li>
                <li><strong>KI-Chat testen</strong> - Erleben Sie die 8-Phasen Coaching-Methodik</li>
              </ol>
            </div>
            
            <div style="text-align: center;">
              <a href="https://coaching-cockpit-live-v2.vercel.app/coach-dashboard.html" class="cta-button">
                🎯 Zum Dashboard
              </a>
            </div>
            
            <h3>💡 Was Sie erwartet:</h3>
            <ul>
              <li><strong>KI-gestütztes Coaching</strong> - Professionelle 8-Phasen Methodik</li>
              <li><strong>Klient-Management</strong> - Einladungen, Notizen, Fortschritt</li>
              <li><strong>Intelligente Gespräche</strong> - Emotionale KI mit Kontext-Memory</li>
              <li><strong>Business-Tools</strong> - Alles für erfolgreiches Ruhestandscoaching</li>
            </ul>
            
            <div class="highlight">
              <p><strong>🎁 Tipp:</strong> Testen Sie zunächst selbst das KI-Chat System, um die Qualität zu erleben!</p>
            </div>
            
            <p>Bei Fragen sind wir für Sie da!</p>
            
            <p>Herzliche Grüße,<br>
            <strong>Ihr Coaching Cockpit Team</strong></p>
          </div>
        </body>
        </html>
      `,
      text: `
        Hallo ${firstName}!
        
        Herzlich willkommen im Coaching Cockpit! Sie haben sich erfolgreich als Coach registriert.
        
        Ihre nächsten Schritte:
        1. Dashboard erkunden: https://coaching-cockpit-live-v2.vercel.app/coach-dashboard.html
        2. Ersten Klienten einladen
        3. KI-Chat testen
        
        Was Sie erwartet:
        - KI-gestütztes Coaching mit 8-Phasen Methodik
        - Professionelles Klient-Management
        - Intelligente Gespräche mit Kontext-Memory
        - Business-Tools für erfolgreiches Ruhestandscoaching
        
        Bei Fragen sind wir für Sie da!
        
        Herzliche Grüße,
        Ihr Coaching Cockpit Team
      `
    });

    console.log('✅ Welcome Email gesendet:', emailData);

    return res.status(200).json({ 
      success: true, 
      message: 'Welcome Email erfolgreich gesendet',
      emailId: emailData.id
    });

  } catch (error) {
    console.error('❌ Email-Fehler:', error);
    return res.status(500).json({ 
      error: 'Email konnte nicht gesendet werden',
      details: error.message 
    });
  }
}