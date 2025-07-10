// api/klient-message.js - VERCEL PRODUCTION COMPATIBLE
// Using global variable for session persistence within single request cycle

// Global storage that persists across function invocations
global.messageStore = global.messageStore || new Map();

export default async function handler(req, res) {
  console.log('💬 Klient Message API called - Method:', req.method, 'Query:', req.query);
  
  const allMessages = global.messageStore;
  
  if (req.method === 'POST') {
    // Klient sending message
    const { sessionId, message, timestamp } = req.body;
    console.log('📨 Klient message received:', { sessionId, message: message?.substring(0, 50) });
    
    if (!sessionId || !message) {
      console.log('❌ Missing sessionId or message');
      return res.status(400).json({ error: 'sessionId and message required' });
    }
    
    // Get or create session messages array
    if (!allMessages.has(sessionId)) {
      allMessages.set(sessionId, []);
      console.log(`🆕 Created new session: ${sessionId}`);
    }
    
    const messageObj = {
      id: Date.now(),
      content: message,
      timestamp: timestamp || new Date().toISOString(),
      author: 'klient',
      delivered: false
    };
    
    allMessages.get(sessionId).push(messageObj);
    
    console.log(`✅ Message stored for session ${sessionId}. Session messages: ${allMessages.get(sessionId).length}`);
    console.log(`🔍 All messages for ${sessionId}:`, allMessages.get(sessionId).map(m => ({id: m.id, content: m.content.substring(0, 30), delivered: m.delivered})));
    
    return res.json({ success: true, messageId: messageObj.id });
    
  } else if (req.method === 'GET') {
    const { type, sessionId } = req.query;
    
    console.log(`📥 GET Request - Type: ${type}, SessionId: ${sessionId}`);
    
    if (type === 'coach_poll') {
      if (!sessionId) {
        console.log('❌ No sessionId provided in coach poll');
        return res.json({ success: false, error: 'sessionId required' });
      }
      
      console.log(`📥 Coach polling for messages for session: ${sessionId}`);
      
      // Debug: Show what's in the message store
      console.log(`🔍 Current message store size: ${allMessages.size}`);
      console.log(`🔍 Available sessions:`, Array.from(allMessages.keys()));
      
      // Get session messages
      const sessionMessages = allMessages.get(sessionId) || [];
      console.log(`🔍 Session ${sessionId} exists:`, allMessages.has(sessionId));
      console.log(`🔍 Session ${sessionId} messages:`, sessionMessages.length);
      
      const undeliveredMessages = sessionMessages.filter(msg => !msg.delivered);
      
      console.log(`📊 Session ${sessionId}: Total ${sessionMessages.length}, Undelivered: ${undeliveredMessages.length}`);
      
      if (undeliveredMessages.length > 0) {
        // Mark as delivered
        undeliveredMessages.forEach(msg => {
          msg.delivered = true;
          console.log(`✅ Marking message ${msg.id} as delivered`);
        });
        
        console.log(`✅ Delivering ${undeliveredMessages.length} messages to coach`);
        
        return res.json({
          success: true,
          messages: undeliveredMessages.map(msg => ({
            id: msg.id,
            content: msg.content,
            author: msg.author,
            timestamp: msg.timestamp
          }))
        });
      }
      
      console.log(`📭 No undelivered messages for session ${sessionId}`);
      return res.json({ success: true, messages: [] });
    }
    
    // Debug endpoint
    console.log(`📊 Debug - Current message store: ${allMessages.size} total sessions`);
    for (const [sid, messages] of allMessages) {
      console.log(`  Session ${sid}: ${messages.length} messages`);
    }
    
    return res.json({ debug: true, sessions: Array.from(allMessages.keys()) });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}