export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  console.log("🚀 SIMPLE PAYMENT API - NO COACH CHECK");
  
  return res.status(200).json({
    message: "PAYMENT API SUCCESS!",
    success: true,
    sessionId: "test_session_123",
    url: "https://checkout.stripe.com/test",
    timestamp: new Date().toISOString()
  });
}
