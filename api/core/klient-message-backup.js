// api/klient-message.js - FINALE GEFIXTE VERSION
let allMessages = []; // Globaler Message Store

export default async function handler(req, res) {
  console.log('💬 Klient Message API called - Method:', req.method);
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Klient sendet Message
    const { sessionId, message, timestamp } = req.body;
    
    console.log('📨 Klient message received:', {
      sessionId,
      message: message?.substring(0, 50),
      timestamp
    });

    if (!sessionId || !message) {
      return res.status(400).json({ 
        error: 'sessionId and message required' 
      });
    }

    // Message zu globalem Store hinzufügen
    const klientMessage = {
      id: Date.now().toString(),
      type: 'COACHEE',
      content: message,
      timestamp: timestamp || new Date().toISOString(),
      sessionId: sessionId,
      delivered: false // WICHTIG: Noch nicht delivered
    };

    allMessages.push(klientMessage);
    
    console.log('✅ Message stored globally. Total messages:', allMessages.length);
    console.log('📊 All messages:', allMessages.map(m => ({id: m.id, content: m.content.substring(0, 30), delivered: m.delivered})));
    
    return res.status(200).json({
      success: true,
      message: 'Message received and stored for coach',
      sessionId: sessionId,
      messageId: klientMessage.id
    });
  }

  if (req.method === 'GET') {
    const { type } = req.query;
    
    if (type === 'coach_poll') {
      // Coach fragt nach neuen Messages
      console.log('📥 Coach polling for messages...');
      console.log('📊 Current message store:', allMessages.length, 'total messages');
      
      // Finde undelivered Messages
      const undeliveredMessages = allMessages.filter(msg => !msg.delivered);
      console.log('📋 Undelivered messages:', undeliveredMessages.length);
      
      if (undeliveredMessages.length > 0) {
        // Markiere als delivered
        undeliveredMessages.forEach(msg => {
          msg.delivered = true;
        });
        
        console.log('✅ Delivering', undeliveredMessages.length, 'messages to coach');
        console.log('📤 Messages:', undeliveredMessages.map(m => m.content.substring(0, 50)));
        
        return res.status(200).json({
          success: true,
          messages: undeliveredMessages,
          totalMessages: allMessages.length
        });
      } else {
        console.log('📭 No new messages for coach');
        return res.status(200).json({
          success: true,
          messages: [],
          totalMessages: allMessages.length
        });
      }
    }
    
    // Standard GET ohne coach_poll
    console.log('📥 Standard GET request');
    return res.status(200).json({
      success: true,
      messages: [],
      info: 'Use ?type=coach_poll for coach polling'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Debug endpoint - zeigt alle Messages
export const getAllMessages = () => allMessages;