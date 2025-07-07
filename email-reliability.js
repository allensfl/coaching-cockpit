export default function handler(req, res) {
  const { method } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (method === 'POST') {
      const { email_type, recipient } = req.body;
      
      if (!email_type || !recipient) {
        return res.status(400).json({ error: 'email_type and recipient required' });
      }
      
      console.log('Email simulated:', { email_type, recipient });
      
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully (simulated)',
        email_id: 'email_' + Date.now()
      });
    }
    
    if (method === 'GET') {
      return res.status(200).json({
        success: true,
        emails: [
          {
            id: 'email_001',
            email_type: 'coach_welcome',
            recipient: 'test@example.com',
            status: 'sent',
            created_at: new Date().toISOString()
          }
        ]
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
