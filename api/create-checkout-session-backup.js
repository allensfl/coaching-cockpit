export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { coachId, email, plan, amount } = req.body;
    
    if (!coachId || !email || !plan || !amount) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }

    console.log(`💰 Creating PayPal payment for ${plan} plan: ${amount} CHF`);

    // Plan-spezifische Beschreibungen
    const planDescriptions = {
      'basic': 'KI-Online.Coach Basic - Bis zu 10 Klienten',
      'professional': 'KI-Online.Coach Professional - Bis zu 50 Klienten', 
      'premium': 'KI-Online.Coach Premium - Unbegrenzte Klienten'
    };

    // PayPal Payment URL mit gestaffelten Preisen
    const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?` +
      `cmd=_xclick` +
      `&business=info@allenspach-coaching.ch` +
      `&item_name=${encodeURIComponent(planDescriptions[plan] || 'KI-Online.Coach')}` +
      `&item_number=${coachId}-${plan}` +
      `&amount=${amount}.00` +
      `&currency_code=CHF` +
      `&return=${req.headers.origin}/coach-dashboard.html?success=true&plan=${plan}&amount=${amount}` +
      `&cancel_return=${req.headers.origin}/upgrade.html?canceled=true` +
      `&notify_url=${req.headers.origin}/api/paypal-webhook` +
      `&custom=${JSON.stringify({ coachId, plan, email })}`;

    return res.status(200).json({
      success: true,
      url: paypalUrl,
      plan: plan,
      amount: `${amount}.00 CHF`,
      provider: 'PayPal',
      description: planDescriptions[plan]
    });

  } catch (error) {
    console.error('❌ PayPal Error:', error);
    return res.status(500).json({ 
      error: 'PayPal payment konnte nicht erstellt werden',
      details: error.message 
    });
  }
}