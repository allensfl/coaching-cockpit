export default function handler(req, res) {
  const { method } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (method === 'GET') {
      const { coach_id } = req.query;
      return res.status(200).json({
        success: true,
        trial_active: true,
        trial_expired: false,
        days_remaining: 12,
        features_available: {
          client_limit: 3,
          max_ai_sessions_per_day: 5
        },
        limits: {
          max_clients: 3,
          max_ai_sessions_per_day: 5
        }
      });
    }
    
    if (method === 'POST') {
      const { coach_id, email } = req.body;
      return res.status(200).json({
        success: true,
        message: 'Trial started successfully',
        trial_id: 'trial_' + Date.now()
      });
    }
    
    if (method === 'PUT') {
      return res.status(200).json({
        success: true,
        message: 'Trial converted successfully'
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
