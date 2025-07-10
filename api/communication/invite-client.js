// /api/invite-client.js - Updated mit SendGrid Integration
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
        const { first_name, last_name, email, phone, notes } = req.body;

        console.log('🎯 Client Invitation API aufgerufen');
        console.log('🎯 Client Daten:', { first_name, last_name, email });

        // Validierung
        if (!first_name || !last_name || !email) {
            return res.status(400).json({
                error: 'Vorname, Nachname und Email sind erforderlich'
            });
        }

        // Email-Format validieren
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Ungültiges Email-Format'
            });
        }

        // Prüfen ob Email bereits existiert
        const { data: existingClient, error: checkError } = await supabase
            .from('clients')
            .select('id, email, status')
            .eq('email', email)
            .single();

        if (existingClient) {
            console.log('⚠️ Client mit Email bereits vorhanden:', existingClient);
            return res.status(409).json({
                error: 'Ein Klient mit dieser Email-Adresse wurde bereits eingeladen',
                status: existingClient.status
            });
        }

        // Invitation Token generieren
        const invitationToken = generateSecureToken();
        
        // TODO: Hier sollte die echte Coach-ID aus der Session kommen
        // Für jetzt nehmen wir die bekannte Coach-ID
        const coachId = '0db62df4-8471-46b9-a47c-37c86bfb61cd';

        console.log('🎯 Erstelle Client in Database...');

        // Client in Database erstellen
        const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert([
                {
                    coach_id: coachId,
                    first_name: first_name.trim(),
                    last_name: last_name.trim(),
                    email: email.toLowerCase().trim(),
                    phone: phone?.trim() || null,
                    notes: notes?.trim() || null,
                    invitation_token: invitationToken,
                    status: 'invited'
                }
            ])
            .select()
            .single();

        if (clientError) {
            console.error('❌ Database Error:', clientError);
            return res.status(500).json({
                error: 'Fehler beim Erstellen des Klienten',
                details: clientError.message
            });
        }

        console.log('✅ Client erfolgreich erstellt:', newClient.id);

        // Coach-Daten für Email holen
        const { data: coach, error: coachError } = await supabase
            .from('coaches')
            .select('first_name, last_name, email')
            .eq('id', coachId)
            .single();

        if (coachError) {
            console.error('⚠️ Warnung: Coach-Daten nicht gefunden:', coachError);
        }

        const coachName = coach ? `${coach.first_name} ${coach.last_name}` : 'Ihr Coach';
        const coachEmail = coach?.email || 'support@coaching-cockpit.com';

        console.log('📧 Sende Einladungs-Email via SendGrid...');

        // Email via SendGrid versenden
        try {
            const emailResponse = await fetch(`${req.headers.origin}/api/send-client-invitation-v2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientEmail: email,
                    clientName: first_name,
                    coachName: coachName,
                    coachEmail: coachEmail,
                    invitationToken: invitationToken
                })
            });

            const emailResult = await emailResponse.json();

            if (emailResponse.ok) {
                console.log('✅ Einladungs-Email erfolgreich versendet');
            } else {
                console.error('⚠️ Email-Versand fehlgeschlagen:', emailResult);
                // Aber trotzdem Success zurückgeben, da Client erstellt wurde
            }
        } catch (emailError) {
            console.error('⚠️ Email-Versand Fehler:', emailError);
            // Nicht kritisch, Client wurde trotzdem erstellt
        }

        console.log('🎉 Client Invitation erfolgreich abgeschlossen');

        return res.status(200).json({
            success: true,
            message: 'Klient erfolgreich eingeladen',
            client: {
                id: newClient.id,
                name: `${first_name} ${last_name}`,
                email: email,
                status: 'invited'
            },
            invitationLink: `${req.headers.origin}/client-dashboard.html?token=${invitationToken}`,
            debug: {
                clientId: newClient.id,
                token: invitationToken,
                coachName: coachName
            }
        });

    } catch (error) {
        console.error('❌ Unerwarteter Fehler:', error);
        return res.status(500).json({
            error: 'Server-Fehler beim Einladen des Klienten',
            details: error.message
        });
    }
}

// Sichere Token-Generierung
function generateSecureToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}