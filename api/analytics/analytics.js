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
      const { coach_id, event_type, event_name, properties } = req.body;
      console.log('Event tracked:', { coach_id, event_type, event_name });
      
      return res.status(200).json({
        success: true,
        message: 'Event tracked successfully',
        event_id: 'evt_' + Date.now()
      });
    }
    
    if (method === 'GET') {
      const { coach_id, period, type } = req.query;
      
      return res.status(200).json({
        success: true,
        period: period || '30d',
        data: {
          overview: {
            total_clients: 3,
            new_clients: 1,
            ai_sessions: 8,
            active_days: 5,
            engagement_rate: 2.7
          }
        }
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
