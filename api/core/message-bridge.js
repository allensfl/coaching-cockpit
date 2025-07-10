// ERSETZE DEINE api/send-to-klient.js MIT DIESEM CODE

// Global message store for klient messages
let klientMessages = new Map(); // sessionId -> messages array

export default async function handler(req, res) {
    console.log(`📡 Send-to-klient API called - Method: ${req.method}`);
    
    if (req.method === 'POST') {
        // Store message for klient
        try {
            const { sessionId, author, content, timestamp } = req.body;
            
            console.log('📥 Storing message for klient:', {
                sessionId,
                author,
                content: content.substring(0, 50) + '...',
                timestamp
            });
            
            if (!sessionId || !author || !content) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: sessionId, author, content'
                });
            }
            
            // Create message object
            const message = {
                messageId: Date.now().toString(),
                author: author, // 'coach' or 'ki'
                content: content,
                timestamp: timestamp || new Date().toISOString(),
                delivered: false
            };
            
            // Store in global map
            if (!klientMessages.has(sessionId)) {
                klientMessages.set(sessionId, []);
            }
            
            const sessionMessages = klientMessages.get(sessionId);
            sessionMessages.push(message);
            
            console.log(`✅ Message stored for klient session ${sessionId}. Total messages: ${sessionMessages.length}`);
            
            return res.status(200).json({
                success: true,
                message: 'Message stored for klient',
                messageId: message.messageId,
                sessionId: sessionId
            });
            
        } catch (error) {
            console.error('❌ Error storing klient message:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
        
    } else if (req.method === 'GET') {
        // Retrieve messages for klient
        try {
            const { sessionId, debug } = req.query;
            
            console.log(`📤 Klient requesting messages for session: ${sessionId}`);
            
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    error: 'sessionId parameter required'
                });
            }
            
            // Get messages for this session
            const sessionMessages = klientMessages.get(sessionId) || [];
            
            // Find undelivered messages
            const undeliveredMessages = sessionMessages.filter(msg => !msg.delivered);
            
            console.log(`📊 Session ${sessionId}: Total ${sessionMessages.length}, Undelivered: ${undeliveredMessages.length}`);
            
            if (debug) {
                console.log('🔍 DEBUG - All messages:', sessionMessages);
                console.log('🔍 DEBUG - Undelivered:', undeliveredMessages);
            }
            
            // Mark messages as delivered
            undeliveredMessages.forEach(msg => {
                msg.delivered = true;
            });
            
            if (undeliveredMessages.length > 0) {
                console.log(`✅ Delivering ${undeliveredMessages.length} messages to klient`);
            }
            
            return res.status(200).json({
                success: true,
                messages: undeliveredMessages,
                sessionId: sessionId,
                totalMessages: sessionMessages.length
            });
            
        } catch (error) {
            console.error('❌ Error retrieving klient messages:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
            success: false,
            error: `Method ${req.method} not allowed`
        });
    }
}