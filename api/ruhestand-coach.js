// api/core/ruhestand-coach.js - OPTIMIZED VERSION
// 🚀 Performance, Security & Intelligence Enhancements

// In-memory cache for development (use Redis in production)
const responseCache = new Map();
const sessionMetrics = new Map();

export default async function handler(req, res) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  console.log(`🤖 [${requestId}] RuhestandSynth API called - Method:`, req.method);
  
  // Enhanced CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24h preflight cache
  
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] OPTIONS request handled`);
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log(`❌ [${requestId}] Method not allowed:`, req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log(`📝 [${requestId}] Processing request...`);
    
    // Enhanced input validation
    const validationResult = await validateAndSanitizeInput(req.body, requestId);
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        error: validationResult.error,
        requestId 
      });
    }

    const { 
      message, 
      sessionContext,
      currentPhase,
      slots,
      messageHistory,
      sessionId 
    } = validationResult.data;

    // Rate limiting check
    const rateLimitCheck = checkRateLimit(sessionId);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before sending another message.',
        retryAfter: rateLimitCheck.retryAfter,
        requestId
      });
    }

    // Check cache first
    const cacheKey = generateCacheKey(message, currentPhase, slots);
    const cachedResponse = getFromCache(cacheKey);
    
    if (cachedResponse) {
      console.log(`⚡ [${requestId}] Cache hit - returning cached response`);
      logMetrics(requestId, startTime, 'cache_hit', currentPhase);
      
      return res.status(200).json({
        ...cachedResponse,
        cached: true,
        requestId
      });
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error(`❌ [${requestId}] OpenAI API key missing`);
      return res.status(500).json({ 
        error: 'Service temporarily unavailable',
        fallback: getFallbackResponse(currentPhase),
        requestId
      });
    }

    console.log(`🎯 [${requestId}] Calling OpenAI API...`);

    // Build optimized messages
    const messages = buildOptimizedMessages(message, currentPhase, slots, messageHistory);
    const maxTokens = getOptimalMaxTokens(currentPhase, messageHistory);

    // Enhanced OpenAI API call with retry logic
    const openaiResponse = await callOpenAIWithRetry({
      model: "gpt-4",
      messages: messages,
      max_tokens: maxTokens,
      temperature: getOptimalTemperature(currentPhase),
      top_p: 0.8,
      frequency_penalty: 0.3,
      presence_penalty: 0.2
    }, requestId);

    if (!openaiResponse.success) {
      console.error(`❌ [${requestId}] OpenAI API error:`, openaiResponse.error);
      
      return res.status(500).json({ 
        error: 'AI service temporarily unavailable',
        fallback: getFallbackResponse(currentPhase),
        requestId
      });
    }

    const aiResponse = openaiResponse.data.choices[0]?.message?.content;

    if (!aiResponse) {
      console.error(`❌ [${requestId}] No response from OpenAI`);
      return res.status(500).json({ 
        error: 'Failed to generate response',
        fallback: getFallbackResponse(currentPhase),
        requestId
      });
    }

    console.log(`✅ [${requestId}] OpenAI response received:`, aiResponse.substring(0, 100));

    // Enhanced AI-based slot extraction
    const extractedSlots = await extractSlotsWithAI(aiResponse, currentPhase);
    
    // Intelligent phase progression detection
    const phaseAnalysis = analyzePhaseProgression(aiResponse, currentPhase, messageHistory);
    
    // Enhanced safety checks
    const safetyCheck = performComprehensiveSafetyCheck(aiResponse, messageHistory);
    
    // Quality assessment
    const qualityScore = assessResponseQuality(aiResponse, currentPhase);

    const responseData = {
      success: true,
      response: aiResponse,
      extractedSlots: extractedSlots,
      phaseAnalysis: phaseAnalysis,
      safetyAlert: safetyCheck.hasAlert,
      safetyMessage: safetyCheck.message,
      qualityScore: qualityScore,
      usage: {
        tokens: openaiResponse.data.usage?.total_tokens || 0,
        model: openaiResponse.data.model,
        cached: false
      },
      requestId
    };

    // Cache successful responses
    if (qualityScore > 0.7) {
      setCache(cacheKey, responseData, currentPhase);
    }

    // Log comprehensive metrics
    logMetrics(requestId, startTime, 'success', currentPhase, {
      tokensUsed: responseData.usage.tokens,
      qualityScore: qualityScore,
      slotsExtracted: Object.keys(extractedSlots).length,
      phase: currentPhase
    });

    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] Unexpected error:`, error);
    
    logMetrics(requestId, startTime, 'error', req.body?.currentPhase || 1);
    
    return res.status(500).json({ 
      error: 'Service temporarily unavailable',
      fallback: getFallbackResponse(req.body?.currentPhase || 1),
      requestId
    });
  }
}

// ===== ENHANCED VALIDATION & SECURITY =====

async function validateAndSanitizeInput(body, requestId) {
  try {
    const { message, currentPhase, sessionId, messageHistory } = body;

    // Required field validation
    if (!message || typeof message !== 'string') {
      return { isValid: false, error: 'Message is required and must be a string' };
    }

    // Length validation
    if (message.length > 2000) {
      return { isValid: false, error: 'Message too long (max 2000 characters)' };
    }

    if (message.length < 3) {
      return { isValid: false, error: 'Message too short (min 3 characters)' };
    }

    // Injection protection
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi
    ];

    if (dangerousPatterns.some(pattern => pattern.test(message))) {
      console.warn(`⚠️ [${requestId}] Potentially dangerous input detected`);
      return { isValid: false, error: 'Invalid input detected' };
    }

    // Sanitize message
    const sanitizedMessage = message
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Phase validation
    const validPhase = Math.max(1, Math.min(8, parseInt(currentPhase) || 1));

    // History validation
    const validHistory = Array.isArray(messageHistory) 
      ? messageHistory.slice(-10) // Keep last 10 messages max
      : [];

    return {
      isValid: true,
      data: {
        ...body,
        message: sanitizedMessage,
        currentPhase: validPhase,
        messageHistory: validHistory,
        sessionId: sessionId || generateSessionId()
      }
    };

  } catch (error) {
    console.error(`❌ [${requestId}] Validation error:`, error);
    return { isValid: false, error: 'Invalid request format' };
  }
}

// ===== SMART CACHING SYSTEM =====

function generateCacheKey(message, phase, slots) {
  // Create semantic hash of the input
  const semantic = `${phase}-${message.toLowerCase().slice(0, 50)}-${JSON.stringify(slots || {})}`;
  return `coach-${hashString(semantic)}`;
}

function getFromCache(key) {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
    return cached.data;
  }
  responseCache.delete(key);
  return null;
}

function setCache(key, data, phase) {
  // Only cache high-quality responses
  const ttl = phase <= 2 ? 1800000 : 3600000; // 30min for early phases, 1h for later
  
  responseCache.set(key, {
    data: { ...data, cached: false }, // Remove cached flag from stored data
    timestamp: Date.now(),
    ttl: ttl
  });

  // Cleanup old cache entries (simple LRU)
  if (responseCache.size > 1000) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
}

// ===== RATE LIMITING =====

const rateLimitStore = new Map();

function checkRateLimit(sessionId) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const maxRequests = 20; // Max 20 requests per minute per session

  const sessionData = rateLimitStore.get(sessionId) || { requests: [], windowStart: now };
  
  // Clean old requests outside window
  sessionData.requests = sessionData.requests.filter(timestamp => now - timestamp < windowMs);
  
  if (sessionData.requests.length >= maxRequests) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((sessionData.requests[0] + windowMs - now) / 1000) 
    };
  }

  sessionData.requests.push(now);
  rateLimitStore.set(sessionId, sessionData);
  
  return { allowed: true, retryAfter: 0 };
}

// ===== OPTIMIZED MESSAGE BUILDING =====

function buildOptimizedMessages(message, currentPhase, slots, messageHistory) {
  // Dynamic phase-specific prompts (much shorter than original)
  const corePrompt = `Du bist «RuhestandSynth», ein empathischer KI-Coach für den Ruhestandsübergang.

STIL: Respektvoll, direkt, lösungsorientiert. Kurze Antworten (2-3 Sätze). Du-Form, «Guillemets». Keine Floskeln.

AKTUELL: ${getPhaseContext(currentPhase)}`;

  const messages = [{ role: "system", content: corePrompt }];

  // Add relevant context from slots
  if (slots?.session_thema) {
    messages.push({
      role: "system",
      content: `Session-Fokus: ${slots.session_thema}`
    });
  }

  // Add recent conversation context (last 3 exchanges)
  if (messageHistory && messageHistory.length > 0) {
    const recentHistory = messageHistory.slice(-6); // Last 3 exchanges (6 messages)
    
    recentHistory.forEach(msg => {
      if (msg.type === 'COACHEE') {
        messages.push({ role: "user", content: msg.content });
      } else if (msg.type === 'KI' && msg.approved) {
        messages.push({ role: "assistant", content: msg.content });
      }
    });
  }

  // Add current message
  messages.push({ role: "user", content: message });

  return messages;
}

function getPhaseContext(phase) {
  const contexts = {
    1: "Phase 1/8 - Standortbestimmung: Erfasse IST-Situation und Hauptthemen.",
    2: "Phase 2/8 - Emotionale Vertiefung: Erkunde Gefühle mit Bildern/Metaphern.",
    3: "Phase 3/8 - Zielvision: Entwickle konkrete Zukunftsbilder.",
    4: "Phase 4/8 - Systemanalyse: Erkenne innere Stimmen und Widersprüche.",
    5: "Phase 5/8 - Komplementärkräfte: Finde Balance zwischen Gegensätzen.",
    6: "Phase 6/8 - Erfolgsimagination: Kreiere zwei Erfolgsszenarien.",
    7: "Phase 7/8 - Konkrete Schritte: Plane sofort umsetzbare Aktionen.",
    8: "Phase 8/8 - Integration: Sammle Erkenntnisse und nächste Schritte."
  };
  
  return contexts[phase] || contexts[1];
}

// ===== ENHANCED AI SLOT EXTRACTION =====

async function extractSlotsWithAI(response, currentPhase) {
  const slots = {};
  
  // Enhanced regex patterns with context awareness
  const patterns = {
    session_thema: {
      regex: /(?:thema|fokus|beschäftigt|problem|herausforderung)(?::|ist)?\s*([^,\n.!?]{10,80})/i,
      confidence: 0.8
    },
    emotion: {
      regex: /(?:gefühl|emotion|empfinde|fühle|angst|freude|sorge|hoffnung)(?::|ist)?\s*([^,\n.!?]{5,50})/i,
      confidence: 0.7
    },
    aktuelle_rolle: {
      regex: /(?:bin|war|arbeite|beruf|position|stelle)(?:\s+als)?\s+([^,\n.!?]{5,50})/i,
      confidence: 0.6
    },
    zukunftsvision: {
      regex: /(?:möchte|will|plane|träume|vision|ziel)(?::|ist)?\s*([^,\n.!?]{10,80})/i,
      confidence: 0.7
    }
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = response.match(pattern.regex);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length > 3) {
        slots[key] = {
          value: extracted,
          confidence: pattern.confidence,
          phase: currentPhase
        };
      }
    }
  }

  // Context-aware special cases
  if (currentPhase === 1 && response.toLowerCase().includes('angst') && 
      response.toLowerCase().includes('leer')) {
    slots.session_thema = {
      value: 'Angst vor der Leere im Ruhestand',
      confidence: 0.9,
      phase: 1
    };
  }

  return slots;
}

// ===== INTELLIGENT PHASE PROGRESSION =====

function analyzePhaseProgression(response, currentPhase, messageHistory) {
  const phaseIndicators = {
    1: { keywords: ['ist', 'aktuell', 'situation', 'problem', 'arbeite'], threshold: 3 },
    2: { keywords: ['fühle', 'emotion', 'angst', 'bild', 'farbe'], threshold: 2 },
    3: { keywords: ['will', 'möchte', 'vision', 'zukunft', 'stelle mir vor'], threshold: 3 },
    4: { keywords: ['stimme', 'teil', 'widerspruch', 'einerseits', 'andererseits'], threshold: 2 },
    5: { keywords: ['balance', 'gleichgewicht', 'zu viel', 'zu wenig'], threshold: 2 },
    6: { keywords: ['szenario', 'variante', 'möglichkeit', 'weg'], threshold: 2 },
    7: { keywords: ['schritt', 'aktion', 'konkret', 'mache', 'beginne'], threshold: 3 },
    8: { keywords: ['erkenntnisse', 'gelernt', 'mitnehme', 'wichtig'], threshold: 2 }
  };

  const currentIndicators = phaseIndicators[currentPhase];
  if (!currentIndicators) return { suggestedPhase: null, confidence: 0, reasoning: '' };

  const lowerResponse = response.toLowerCase();
  const hitCount = currentIndicators.keywords.filter(keyword => 
    lowerResponse.includes(keyword)
  ).length;

  const coverage = hitCount / currentIndicators.keywords.length;
  const isPhaseComplete = hitCount >= currentIndicators.threshold;

  // Consider conversation depth
  const conversationDepth = messageHistory?.length || 0;
  const minMessagesPerPhase = 2;
  const hasMinimumDepth = conversationDepth >= (currentPhase * minMessagesPerPhase);

  const shouldProgress = isPhaseComplete && hasMinimumDepth && currentPhase < 8;

  return {
    suggestedPhase: shouldProgress ? currentPhase + 1 : null,
    confidence: coverage,
    reasoning: shouldProgress ? `Phase ${currentPhase} indicators complete (${hitCount}/${currentIndicators.threshold})` : 
               `Phase ${currentPhase} needs more exploration (${hitCount}/${currentIndicators.threshold})`,
    coverage: coverage,
    hitCount: hitCount,
    isComplete: isPhaseComplete
  };
}

// ===== ENHANCED SAFETY CHECKS =====

function performComprehensiveSafetyCheck(response, messageHistory) {
  const criticalKeywords = [
    'suizid', 'selbstmord', 'umbringen', 'leben beenden',
    'sinnlos leben', 'nichts wert', 'hoffnungslos'
  ];

  const therapeuticKeywords = [
    'depression', 'therapie', 'psychiater', 'medikament',
    'antidepressiva', 'panikattacken'
  ];

  const substanceKeywords = [
    'alkohol problem', 'trinke täglich', 'drogen', 'abhängig'
  ];

  const lowerResponse = response.toLowerCase();
  const recentConversation = messageHistory?.slice(-3)
    .map(msg => msg.content?.toLowerCase()).join(' ') || '';

  // Check for critical safety issues
  const criticalAlert = criticalKeywords.some(keyword => 
    lowerResponse.includes(keyword) || recentConversation.includes(keyword)
  );

  if (criticalAlert) {
    return {
      hasAlert: true,
      level: 'CRITICAL',
      message: "[NOTFALL] Bitte wende dich sofort an eine Beratungsstelle: Telefonseelsorge 0800 111 0 111"
    };
  }

  // Check for therapeutic boundaries
  const therapeuticAlert = therapeuticKeywords.some(keyword => 
    lowerResponse.includes(keyword)
  );

  if (therapeuticAlert) {
    return {
      hasAlert: true,
      level: 'THERAPEUTIC',
      message: "[THERAPEUTISCHE GRENZE] Professionelle therapeutische Unterstützung könnte hilfreich sein."
    };
  }

  // Check for substance issues
  const substanceAlert = substanceKeywords.some(keyword => 
    lowerResponse.includes(keyword)
  );

  if (substanceAlert) {
    return {
      hasAlert: true,
      level: 'SUBSTANCE',
      message: "[FACHBERATUNG] Bei Substanzproblemen empfehle ich eine Suchtberatungsstelle."
    };
  }

  return { hasAlert: false, level: null, message: null };
}

// ===== ADAPTIVE RESPONSE OPTIMIZATION =====

function getOptimalMaxTokens(currentPhase, messageHistory) {
  const baseLengths = {
    1: 400, // Exploration - moderate length
    2: 300, // Emotional work - shorter, focused
    3: 500, // Vision work - longer for creativity
    4: 400, // Analysis - moderate
    5: 350, // Balance work - focused
    6: 500, // Imagination - longer
    7: 300, // Action planning - concise
    8: 600  // Integration - comprehensive
  };

  // Adjust based on conversation depth
  const conversationDepth = messageHistory?.length || 0;
  const depthMultiplier = Math.min(1.3, 1 + (conversationDepth * 0.05));
  
  return Math.round(baseLengths[currentPhase] * depthMultiplier);
}

function getOptimalTemperature(currentPhase) {
  // Creative phases need higher temperature
  const creativePhases = [2, 3, 6]; // Emotional, Vision, Imagination
  return creativePhases.includes(currentPhase) ? 0.8 : 0.6;
}

// ===== RESPONSE QUALITY ASSESSMENT =====

function assessResponseQuality(response, currentPhase) {
  let score = 0.5; // Base score

  // Length check (should not be too short or too long)
  const wordCount = response.split(' ').length;
  if (wordCount >= 20 && wordCount <= 150) score += 0.2;

  // Phase-appropriate content
  const phaseKeywords = {
    1: ['situation', 'aktuell', 'ist', 'beschäftigt'],
    2: ['gefühl', 'emotion', 'fühlen', 'bild', 'farbe'],
    3: ['vision', 'vorstellen', 'zukunft', 'möchte'],
    // ... etc
  };

  const keywords = phaseKeywords[currentPhase] || [];
  const keywordHits = keywords.filter(kw => 
    response.toLowerCase().includes(kw)
  ).length;
  
  if (keywordHits > 0) score += Math.min(0.2, keywordHits * 0.05);

  // Question presence (good for coaching)
  const questionCount = (response.match(/\?/g) || []).length;
  if (questionCount >= 1 && questionCount <= 3) score += 0.1;

  // Avoid repetitive responses
  const uniqueWords = new Set(response.toLowerCase().split(' ')).size;
  const totalWords = response.split(' ').length;
  const uniqueRatio = uniqueWords / totalWords;
  if (uniqueRatio > 0.7) score += 0.1;

  return Math.min(1.0, score);
}

// ===== ENHANCED ERROR HANDLING =====

async function callOpenAIWithRetry(params, requestId, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params),
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error types
        if (response.status === 429) {
          console.warn(`⚠️ [${requestId}] Rate limit hit, attempt ${attempt}/${maxRetries}`);
          if (attempt < maxRetries) {
            await sleep(1000 * attempt); // Exponential backoff
            continue;
          }
        }

        return {
          success: false,
          error: sanitizeOpenAIError(errorData, response.status)
        };
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.error(`❌ [${requestId}] OpenAI attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        return {
          success: false,
          error: 'Network error - please try again'
        };
      }
      
      await sleep(500 * attempt);
    }
  }
}

function sanitizeOpenAIError(errorData, statusCode) {
  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    return errorData.error?.message || 'OpenAI API error';
  }

  // Safe error messages for production
  const safeErrors = {
    400: 'Invalid request format',
    401: 'Authentication error',
    429: 'Service busy - please try again',
    500: 'AI service temporarily unavailable',
    503: 'Service temporarily unavailable'
  };

  return safeErrors[statusCode] || 'Service temporarily unavailable';
}

// ===== METRICS & MONITORING =====

function logMetrics(requestId, startTime, result, phase, additionalData = {}) {
  const duration = Date.now() - startTime;
  
  const metrics = {
    requestId,
    timestamp: new Date().toISOString(),
    duration,
    result,
    phase,
    ...additionalData
  };

  console.log(`📊 [${requestId}] Metrics:`, metrics);
  
  // Store session metrics for analytics
  sessionMetrics.set(requestId, metrics);
  
  // Cleanup old metrics (keep last 1000)
  if (sessionMetrics.size > 1000) {
    const oldestKey = sessionMetrics.keys().next().value;
    sessionMetrics.delete(oldestKey);
  }
}

// ===== UTILITY FUNCTIONS =====

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== FALLBACK RESPONSES (UNCHANGED BUT ORGANIZED) =====

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