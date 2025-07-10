// api/ruhestand-coach.js - Korrekter Code für Chat Completions
export default async function handler(req, res) {
  console.log('🤖 RuhestandSynth API called - Method:', req.method);
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📝 Processing request...');
    
    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key missing');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        fallback: getFallbackResponse(1)
      });
    }

    const { 
      message, 
      sessionContext,
      currentPhase,
      slots,
      messageHistory 
    } = req.body;

    console.log('📊 Request data:', {
      message: message?.substring(0, 100),
      currentPhase,
      hasSlots: !!slots,
      historyLength: messageHistory?.length || 0
    });

    // Validate required fields
    if (!message) {
      console.log('❌ Message missing');
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    console.log('🎯 Calling OpenAI API...');

    // Use fetch instead of OpenAI library
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: buildMessages(message, currentPhase, slots, messageHistory),
        max_tokens: 800,
        temperature: 0.6,
        top_p: 0.8,
        frequency_penalty: 0.3,
        presence_penalty: 0.2
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('❌ OpenAI API error:', errorData);
      
      return res.status(500).json({ 
        error: 'OpenAI API error',
        details: errorData.error?.message,
        fallback: getFallbackResponse(currentPhase || 1)
      });
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content;

    if (!aiResponse) {
      console.error('❌ No response from OpenAI');
      return res.status(500).json({ 
        error: 'No response from OpenAI',
        fallback: getFallbackResponse(currentPhase || 1)
      });
    }

    console.log('✅ OpenAI response received:', aiResponse.substring(0, 100));

    // Extract any slot updates from AI response
    const extractedSlots = extractSlotsFromResponse(aiResponse);
    
    // Detect phase progression
    const suggestedPhase = detectPhaseProgression(aiResponse, currentPhase);

    // Check for safety concerns
    const safetyCheck = checkSafetyConcerns(aiResponse);

    return res.status(200).json({
      success: true,
      response: aiResponse,
      extractedSlots: extractedSlots,
      suggestedPhase: suggestedPhase,
      safetyAlert: safetyCheck.hasAlert,
      safetyMessage: safetyCheck.message,
      usage: {
        tokens: openaiData.usage?.total_tokens || 0,
        model: openaiData.model
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to generate AI response',
      details: error.message,
      fallback: getFallbackResponse(req.body?.currentPhase || 1)
    });
  }
}

// Build messages for OpenAI API
function buildMessages(message, currentPhase, slots, messageHistory) {
  const RUHESTAND_SYNTH_PROMPT = `Du bist «RuhestandSynth», ein achtsamer, tiefgründiger KI-Coach mit Spezialisierung auf den Übergang in den Ruhestand.

STIL:
- Respektvoll, empathisch, lösungsorientiert, direkt und authentisch
- Natürlich und bodenständig, NIEMALS übertrieben poetisch oder pathetisch
- Vermeide Wiederholungen und Floskeln wie "liebevoll", "achtsam", "Herzenswunsch"
- Kurze, prägnante Antworten - maximal 2-3 Sätze
- Verwende Du-Form, ausschließlich ss, Guillemets « » statt Anführungszeichen
- Sei konkret und hilfreich statt blumig

FACHLICHE GRUNDLAGEN:
- Statuspassage, Phasenmodell, Demografie, Agency, Biografiearbeit
- Rollenverlust, Identität, Zeitstruktur, soziale Isolation, Ambiguitätstoleranz
- Frankls Sinnmodelle, Wertearbeit, SMART/MoBo-Ziele, Future-Me, Engagement
- Lösungs-/Ressourcenorientierung, Selbstwirksamkeit, Biografiearbeit, Visualisierung

COACHING-PHASEN:
1. Standortbestimmung: «Erzähle mir, was dich am meisten bewegt und was dein Herzenswunsch ist.»
2. Emotionale Vertiefung: «Welches Bild, welche Farbe oder Metapher spiegelt dein zentrales Gefühl?»
3. Zielvision: «Stelle dir deinen erfüllten Ruhestand vor – welches Symbol steht dafür?»
4. Systemanalyse: «Welche Stimmen in dir stehen im Widerstreit?»
5. Komplementärkräfte: «Wo fehlt dir Balance zwischen Aktion und Reflexion?»
6. Erfolgsimagination: «Beschreibe zwei verschiedene Szenarien deines erfolgreichen Ruhestands.»
7. Konkrete Schritte: «Welche drei Aktivitäten unterstützen dein Ziel?»
8. Integration: «Was nimmst du aus dieser Sitzung mit?»

Du antwortest IMMER in der Rolle von RuhestandSynth und hältst dich strikt an die 8-Phasen-Struktur.

WICHTIG: 
- Vermeide Wiederholungen aus vorherigen Nachrichten
- Antworte knapp und direkt (maximal 2-3 Sätze)
- Keine übertriebene Poetik oder Pathos
- Stelle konkrete, hilfreiche Fragen`;

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

  let context = `AKTUELLE SESSION-INFORMATIONEN:
- Phase: ${currentPhase}/8 (${phaseNames[currentPhase] || 'Standortbestimmung'})`;

  if (slots?.session_thema) {
    context += `\n- Session Thema: ${slots.session_thema}`;
  }

  context += `\n\nAls RuhestandSynth sollst du entsprechend der aktuellen Phase ${currentPhase} antworten und dem Coachee helfen, tiefer zu erkunden.`;

  const messages = [
    {
      role: "system",
      content: RUHESTAND_SYNTH_PROMPT + "\n\n" + context
    }
  ];

  // Add recent message history (last 5 messages for context)
  if (messageHistory && messageHistory.length > 0) {
    const recentHistory = messageHistory.slice(-5);
    
    recentHistory.forEach(msg => {
      if (msg.type === 'COACHEE') {
        messages.push({
          role: "user",
          content: msg.content
        });
      } else if (msg.type === 'KI' && msg.approved) {
        messages.push({
          role: "assistant", 
          content: msg.content
        });
      }
    });
  }

  // Add current message
  messages.push({
    role: "user",
    content: message
  });

  return messages;
}

// Extract slot values from AI response
function extractSlotsFromResponse(response) {
  const slots = {};
  
  // Simple regex patterns to extract common slot updates
  const patterns = {
    session_thema: /(?:thema|fokus|beschäftigt):\s*([^,\n.]+)/i,
    emotion: /(?:gefühl|emotion|stimmung|angst):\s*([^,\n.]+)/i,
    aktuelle_rolle: /(?:rolle|beruf|position):\s*([^,\n.]+)/i
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = response.match(pattern);
    if (match) {
      slots[key] = match[1].trim();
    }
  }

  // Special case: detect "Angst vor der Leere" type themes
  if (response.toLowerCase().includes('angst') && response.toLowerCase().includes('leer')) {
    slots.session_thema = 'Angst vor der Leere im Ruhestand';
    slots.emotion = 'Angst, Unsicherheit';
  }

  return slots;
}

// Detect if AI suggests moving to next phase
function detectPhaseProgression(response, currentPhase) {
  const progressionKeywords = [
    'nächste schritt', 'weiter', 'bereit für', 'gehen wir zu',
    'phase', 'vertiefen wir', 'erkunden wir', 'schauen wir'
  ];

  const hasProgression = progressionKeywords.some(keyword => 
    response.toLowerCase().includes(keyword)
  );

  if (hasProgression && currentPhase < 8) {
    return currentPhase + 1;
  }

  return null;
}

// Check for safety concerns in the conversation
function checkSafetyConcerns(response) {
  const safetyKeywords = [
    'suizid', 'selbstmord', 'töten', 'sterben wollen',
    'depression', 'hoffnungslos', 'sinnlos', 'therapie',
    'medikament', 'alkohol', 'drogen'
  ];

  const lowerResponse = response.toLowerCase();
  const hasAlert = safetyKeywords.some(keyword => 
    lowerResponse.includes(keyword)
  );

  if (hasAlert) {
    return {
      hasAlert: true,
      message: "[THERAPEUTISCHE GRENZE] - Professionelle Unterstützung könnte hilfreich sein."
    };
  }

  return { hasAlert: false, message: null };
}

// Fallback responses when OpenAI is not available
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