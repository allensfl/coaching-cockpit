// api/ruhestand-assistant.js - OpenAI Assistants API Integration
export default async function handler(req, res) {
  console.log('🤖 RuhestandSynth Assistant API called');
  
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
    const { 
      message, 
      sessionContext,
      currentPhase,
      slots,
      threadId
    } = req.body;

    console.log('📊 Request data:', {
      message: message?.substring(0, 100),
      currentPhase,
      hasThreadId: !!threadId
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key missing');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        fallback: getFallbackResponse(currentPhase || 1)
      });
    }

    if (!process.env.RUHESTAND_ASSISTANT_ID) {
      console.error('❌ Assistant ID missing');
      return res.status(500).json({ 
        error: 'Assistant ID not configured',
        fallback: getFallbackResponse(currentPhase || 1)
      });
    }

    const ASSISTANT_ID = process.env.RUHESTAND_ASSISTANT_ID;
    let currentThreadId = threadId;

    // Schritt 1: Thread erstellen oder verwenden
    if (!currentThreadId) {
      console.log('🆕 Creating new thread...');
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          metadata: {
            session_phase: currentPhase.toString(),
            session_context: sessionContext || ''
          }
        })
      });

      if (!threadResponse.ok) {
        const errorData = await threadResponse.json();
        console.error('❌ Thread creation failed:', errorData);
        throw new Error(`Failed to create thread: ${threadResponse.status}`);
      }

      const threadData = await threadResponse.json();
      currentThreadId = threadData.id;
      console.log('✅ Thread created:', currentThreadId);
    }

    // Schritt 2: Message zum Thread hinzufügen
    console.log('💬 Adding message to thread...');
    
    const contextMessage = buildContextMessage(currentPhase, slots, sessionContext);
    const fullMessage = contextMessage + "\n\nCoachee: " + message;

    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: fullMessage
      })
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      console.error('❌ Message addition failed:', errorData);
      throw new Error(`Failed to add message: ${messageResponse.status}`);
    }

    // Schritt 3: Run erstellen
    console.log('🏃 Creating run...');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        instructions: `Du bist gerade in Phase ${currentPhase}/8 des Ruhestandscoaching-Prozesses. Antworte entsprechend der aktuellen Phase und nutze dein Wissen aus den hochgeladenen Dokumenten.`
      })
    });

    if (!runResponse.ok) {
      const errorData = await runResponse.json();
      console.error('❌ Run creation failed:', errorData);
      throw new Error(`Failed to create run: ${runResponse.status}`);
    }

    const runData = await runResponse.json();
    const runId = runData.id;

    // Schritt 4: Warten auf Completion
    console.log('⏳ Waiting for completion...');
    let runStatus = 'in_progress';
    let attempts = 0;
    const maxAttempts = 30;

    while (runStatus === 'in_progress' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
      
      console.log(`🔄 Run status: ${runStatus} (attempt ${attempts})`);
    }

    if (runStatus !== 'completed') {
      console.error('❌ Run not completed:', runStatus);
      throw new Error(`Run failed with status: ${runStatus}`);
    }

    // Schritt 5: Antwort abrufen
    console.log('📥 Retrieving messages...');
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages?limit=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error(`Failed to retrieve messages: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const latestMessage = messagesData.data[0];
    
    if (!latestMessage || latestMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    const aiResponse = latestMessage.content[0]?.text?.value;

    if (!aiResponse) {
      throw new Error('No text content in assistant response');
    }

    console.log('✅ Assistant response received:', aiResponse.substring(0, 100));

    // Extract slots und analyze response
    const extractedSlots = extractSlotsFromResponse(aiResponse);
    const suggestedPhase = detectPhaseProgression(aiResponse, currentPhase);
    const safetyCheck = checkSafetyConcerns(aiResponse);

    return res.status(200).json({
      success: true,
      response: aiResponse,
      threadId: currentThreadId,
      extractedSlots: extractedSlots,
      suggestedPhase: suggestedPhase,
      safetyAlert: safetyCheck.hasAlert,
      safetyMessage: safetyCheck.message,
      usage: {
        model: 'gpt-4-turbo-preview',
        assistant_id: ASSISTANT_ID
      }
    });

  } catch (error) {
    console.error('❌ Assistant API error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to generate AI response',
      details: error.message,
      fallback: getFallbackResponse(req.body?.currentPhase || 1)
    });
  }
}

// Build context message for current session
function buildContextMessage(currentPhase, slots, sessionContext) {
  const phaseNames = {
    1: "Standortbestimmung",
    2: "Emotionale Vertiefung", 
    3: "Zielvision",
    4: "Systemanalyse",
    5: "Komplementärkräfte",
    6: "Erfolgsimagination",
    7: "Konkrete Schritte",
    8: "Integration"
  };

  let context = `COACHING SESSION KONTEXT:
Phase: ${currentPhase}/8 (${phaseNames[currentPhase] || 'Standortbestimmung'})`;

  if (slots?.session_thema) {
    context += `\nSession Thema: ${slots.session_thema}`;
  }
  
  if (slots?.emotion) {
    context += `\nAktuelle Emotion: ${slots.emotion}`;
  }

  if (sessionContext) {
    context += `\nZusätzlicher Kontext: ${sessionContext}`;
  }

  return context;
}

// Extract slot values from AI response
function extractSlotsFromResponse(response) {
  const slots = {};
  
  const patterns = {
    session_thema: /(?:thema|fokus|beschäftigt|kern|sorge):\s*([^,\n.!?]+)/i,
    emotion: /(?:gefühl|emotion|stimmung|angst|freude|sorge|panik):\s*([^,\n.!?]+)/i,
    aktuelle_rolle: /(?:rolle|beruf|position|arbeit|job|führung):\s*([^,\n.!?]+)/i,
    identitaet: /(?:identität|wer bin ich|selbstbild):\s*([^,\n.!?]+)/i
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = response.match(pattern);
    if (match) {
      slots[key] = match[1].trim();
    }
  }

  // Special detection for common retirement themes
  if (response.toLowerCase().includes('identität') && response.toLowerCase().includes('rolle')) {
    slots.session_thema = 'Identitätskrise nach Rollenverlust';
  }
  
  if (response.toLowerCase().includes('wert') && response.toLowerCase().includes('nichts')) {
    slots.emotion = 'Angst vor Wertlosigkeit';
  }

  return slots;
}

// Detect phase progression
function detectPhaseProgression(response, currentPhase) {
  const progressionKeywords = [
    'nächste schritt', 'weiter', 'bereit für', 'vertiefen',
    'erkunden wir', 'schauen wir', 'gehen wir zu'
  ];

  const hasProgression = progressionKeywords.some(keyword => 
    response.toLowerCase().includes(keyword)
  );

  if (hasProgression && currentPhase < 8) {
    return currentPhase + 1;
  }

  return null;
}

// Check for safety concerns
function checkSafetyConcerns(response) {
  const safetyKeywords = [
    'suizid', 'selbstmord', 'sterben wollen',
    'hoffnungslos', 'therapie', 'depression'
  ];

  const lowerResponse = response.toLowerCase();
  const hasAlert = safetyKeywords.some(keyword => 
    lowerResponse.includes(keyword)
  );

  if (hasAlert) {
    return {
      hasAlert: true,
      message: "[THERAPEUTISCHE GRENZE] - Professionelle Unterstützung empfohlen."
    };
  }

  return { hasAlert: false, message: null };
}

// Fallback responses
function getFallbackResponse(currentPhase) {
  const fallbacks = {
    1: "«Was beschäftigt dich gerade am meisten beim Gedanken an den Ruhestand?»",
    2: "«Wie würdest du dein aktuelles Gefühl beschreiben?»",
    3: "«Wie stellst du dir einen erfüllten Ruhestand vor?»",
    4: "«Welche inneren Stimmen hörst du zu diesem Thema?»",
    5: "«Wo brauchst du mehr Balance in deinem Leben?»",
    6: "«Beschreibe deinen idealen Ruhestand in ein paar Worten.»",
    7: "«Welchen ersten Schritt könntest du heute gehen?»",
    8: "«Was ist dein wichtigster Erkenntnisgewinn heute?»"
  };

  return fallbacks[currentPhase] || "«Erzähle mir mehr über deine Gedanken dazu.»";
}