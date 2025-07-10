// /api/send-client-invitation-v2.js
import sgMail from '@sendgrid/mail';

// SendGrid API Key setzen
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
    console.log('🔥 EMAIL API WURDE AUFGERUFEN! 🔥'); 
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
        const { 
            clientEmail, 
            clientName, 
            coachName, 
            invitationToken,
            coachEmail 
        } = req.body;

        console.log('📧 SendGrid Email API aufgerufen');
        console.log('📧 Empfänger:', clientEmail);
        console.log('📧 Token:', invitationToken);

        if (!clientEmail || !clientName || !invitationToken) {
            return res.status(400).json({ 
                error: 'Fehlende Parameter für Email-Versand' 
            });
        }

        // Invitation-Link erstellen
        const invitationLink = `https://coaching-cockpit-live-v2.vercel.app/client-dashboard.html?token=${invitationToken}`;
        
        console.log('📧 Invitation Link:', invitationLink);

        // Email-Template erstellen
        const emailContent = createInvitationEmailTemplate({
            clientName,
            coachName: coachName || 'Ihr Coach',
            invitationLink,
            coachEmail: coachEmail || 'support@coaching-cockpit.com'
        });

        // SendGrid Email-Objekt
        const msg = {
            to: clientEmail,
            from: {
                email: 'coaching@ki-online.coach', // Deine verifizierte Domain
                name: 'Coaching Cockpit'
            },
            replyTo: coachEmail || 'support@coaching-cockpit.com',
            subject: `🎯 Einladung zu Ihrem persönlichen Ruhestandscoaching`,
            html: emailContent.html,
            text: emailContent.text
        };

        console.log('📧 Versende Email via SendGrid...');

        // Email versenden
        const response = await sgMail.send(msg);
        
        console.log('✅ SendGrid Response Status:', response[0].statusCode);
        console.log('✅ Email erfolgreich versendet an:', clientEmail);

        return res.status(200).json({
            success: true,
            message: 'Email erfolgreich versendet',
            recipient: clientEmail,
            statusCode: response[0].statusCode
        });

    } catch (error) {
        console.error('❌ SendGrid Email Error:', error);
        
        // SendGrid-spezifische Fehlerbehandlung
        if (error.response) {
            console.error('❌ SendGrid API Error:', error.response.body);
            return res.status(error.code || 500).json({
                error: 'Email-Versand fehlgeschlagen',
                details: error.response.body.errors || error.message
            });
        }

        return res.status(500).json({
            error: 'Server-Fehler beim Email-Versand',
            details: error.message
        });
    }
}

// Email-Template Funktion
function createInvitationEmailTemplate({ clientName, coachName, invitationLink, coachEmail }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Einladung zu Ihrem Ruhestandscoaching</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; font-size: 28px; margin: 0; margin-bottom: 10px;">
            🎯 Coaching Cockpit
        </h1>
        <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">
            Ihr persönliches Ruhestandscoaching wartet auf Sie
        </p>
    </div>

    <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
        <h2 style="color: #333; margin-top: 0;">Hallo ${clientName}! 👋</h2>
        
        <p><strong>${coachName}</strong> hat Sie zu einem professionellen Ruhestandscoaching eingeladen.</p>
        
        <p>Unser KI-gestütztes 8-Phasen-Programm hilft Ihnen dabei:</p>
        
        <ul style="color: #555; padding-left: 20px;">
            <li>🎯 Ihre Ziele für den Ruhestand zu definieren</li>
            <li>💰 Ihre Finanzen optimal zu planen</li>
            <li>🏃‍♂️ Gesundheit und Lebensqualität zu fördern</li>
            <li>👥 Soziale Kontakte zu stärken</li>
            <li>🎨 Sinnvolle Aktivitäten zu finden</li>
            <li>🏠 Die ideale Wohnsituation zu planen</li>
            <li>📋 Rechtliche Aspekte abzusichern</li>
            <li>✅ Ihre Pläne erfolgreich umzusetzen</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" 
           style="background: linear-gradient(45deg, #ff6b6b, #feca57); 
                  color: white; 
                  text-decoration: none; 
                  padding: 15px 30px; 
                  border-radius: 25px; 
                  font-weight: 600; 
                  font-size: 18px; 
                  display: inline-block;
                  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);">
            🚀 Coaching jetzt starten
        </a>
    </div>

    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="color: #1976d2; margin-top: 0;">💡 Was Sie erwartet:</h3>
        <p style="margin-bottom: 0; color: #555;">
            • Personalisierte KI-Unterstützung<br>
            • Strukturiertes 8-Phasen-Programm<br>
            • Professionelle Begleitung durch ${coachName}<br>
            • Flexible Bearbeitung in Ihrem Tempo
        </p>
    </div>

    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #666;">
        <p><strong>Fragen?</strong> Antworten Sie einfach auf diese Email oder kontaktieren Sie ${coachName} direkt: 
        <a href="mailto:${coachEmail}" style="color: #667eea;">${coachEmail}</a></p>
        
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Diese Einladung wurde von ${coachName} über Coaching Cockpit versendet.<br>
            Falls Sie diese Email irrtümlich erhalten haben, können Sie sie einfach ignorieren.
        </p>
    </div>

</body>
</html>`;

    const text = `
Hallo ${clientName}!

${coachName} hat Sie zu einem professionellen Ruhestandscoaching eingeladen.

Unser KI-gestütztes 8-Phasen-Programm hilft Ihnen dabei:
• Ihre Ziele für den Ruhestand zu definieren
• Ihre Finanzen optimal zu planen  
• Gesundheit und Lebensqualität zu fördern
• Soziale Kontakte zu stärken
• Sinnvolle Aktivitäten zu finden
• Die ideale Wohnsituation zu planen
• Rechtliche Aspekte abzusichern
• Ihre Pläne erfolgreich umzusetzen

Coaching jetzt starten: ${invitationLink}

Was Sie erwartet:
• Personalisierte KI-Unterstützung
• Strukturiertes 8-Phasen-Programm  
• Professionelle Begleitung durch ${coachName}
• Flexible Bearbeitung in Ihrem Tempo

Fragen? Kontaktieren Sie ${coachName}: ${coachEmail}

--
Coaching Cockpit - Ihr Partner für den erfolgreichen Ruhestand
`;

    return { html, text };
}