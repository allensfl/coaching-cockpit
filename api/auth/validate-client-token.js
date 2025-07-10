// /api/validate-client-token.js
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
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token ist erforderlich' 
            });
        }

        console.log('🎯 Validiere Token:', token);

        // 1. Client anhand Token finden
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('invitation_token', token)
            .eq('status', 'invited')
            .single();

        if (clientError || !client) {
            console.error('❌ Client nicht gefunden:', clientError);
            return res.status(404).json({ 
                success: false, 
                error: 'Ungültiger oder abgelaufener Einladungs-Link' 
            });
        }

        console.log('✅ Client gefunden:', client);

        // 2. Coach-Info holen
        const { data: coach, error: coachError } = await supabase
            .from('coaches')
            .select('*')
            .eq('id', client.coach_id)
            .single();

        if (coachError) {
            console.error('❌ Coach nicht gefunden:', coachError);
            return res.status(404).json({ 
                success: false, 
                error: 'Coach-Informationen nicht verfügbar' 
            });
        }

        console.log('✅ Coach gefunden:', coach);

        // 3. Optional: Client-Status auf 'active' setzen bei erstem Zugriff
        if (client.status === 'invited') {
            const { error: updateError } = await supabase
                .from('clients')
                .update({ 
                    status: 'active',
                    first_access: new Date().toISOString()
                })
                .eq('id', client.id);

            if (updateError) {
                console.error('⚠️ Warnung: Status-Update fehlgeschlagen:', updateError);
                // Nicht kritisch, weiter machen
            } else {
                console.log('✅ Client-Status auf "active" gesetzt');
            }
        }

        // 4. Erfolgreiche Response
        return res.status(200).json({
            success: true,
            client: {
                id: client.id,
                first_name: client.first_name,
                last_name: client.last_name,
                email: client.email,
                coach_id: client.coach_id,
                status: 'active'
            },
            coach: {
                id: coach.id,
                first_name: coach.first_name,
                last_name: coach.last_name,
                title: coach.title,
                experience: coach.experience,
                email: coach.email
            }
        });

    } catch (error) {
        console.error('❌ Server Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server-Fehler beim Validieren des Tokens' 
        });
    }
}