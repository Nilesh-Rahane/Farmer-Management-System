const fs = require('fs');
const path = require('path');
const { MCP_TOOL_DEFINITIONS, executeTool } = require('./assistantTools');
const { processFarmerQuery: fallbackRuleBasedQuery, getFarmerDatabaseContext } = require('./marathiAssistant');

/**
 * Dynamically resolves environment variables from process.env, .env, or .env.example
 * This ensures that even if .env was updated after server start, or if the user added their key to .env.example,
 * it is immediately picked up at query execution time.
 */
function getEnvVar(keyName) {
  if (process.env[keyName] && process.env[keyName].trim() && !process.env[keyName].includes('your_')) {
    return process.env[keyName].trim();
  }

  // 1. Check .env directly
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`^\\s*${keyName}\\s*=\\s*(.*)$`, 'm'));
      if (match && match[1]) {
        const val = match[1].trim().replace(/^['"](.*)['"]$/, '$1');
        if (val && !val.includes('your_') && val.length > 5) {
          process.env[keyName] = val;
          return val;
        }
      }
    }
  } catch (e) {}

  // 2. Check .env.example directly as fallback
  try {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(envExamplePath)) {
      const content = fs.readFileSync(envExamplePath, 'utf8');
      const match = content.match(new RegExp(`^\\s*${keyName}\\s*=\\s*(.*)$`, 'm'));
      if (match && match[1]) {
        const val = match[1].trim().replace(/^['"](.*)['"]$/, '$1');
        if (val && !val.includes('your_') && val.length > 5) {
          process.env[keyName] = val;
          return val;
        }
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Format currency in Indian Numbering System (e.g. ₹1,25,000)
 */
function formatCurrency(amount) {
  const num = Math.round(Number(amount) || 0);
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Clean text for natural Marathi speech synthesis (removes asterisks, markdown, emojis)
 */
function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[*#_~`]/g, '')
    .replace(/[🌱🌾💰👷📊💡📌✅⚠️•↳━ℹ️]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert MCP Tool definitions into Google Gemini function declarations
 */
function getGeminiFunctionDeclarations() {
  return MCP_TOOL_DEFINITIONS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'OBJECT',
      properties: Object.entries(tool.inputSchema.properties || {}).reduce((acc, [key, prop]) => {
        acc[key] = {
          type: prop.type === 'string' ? 'STRING' : prop.type === 'number' ? 'NUMBER' : 'STRING',
          description: prop.description,
        };
        return acc;
      }, {}),
      required: tool.inputSchema.required || [],
    },
  }));
}

/**
 * Convert MCP Tool definitions into OpenAI-compatible tool specifications
 */
function getOpenAITools() {
  return MCP_TOOL_DEFINITIONS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

/**
 * Execute a specific Gemini model with tool calling loop
 */
async function executeGeminiModelWithTools(apiKey, modelName, query, farmerId, farmerUser) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const farmerName = farmerUser?.name || 'शेतकरी मित्र';
  const farmName = farmerUser?.farmName || 'आपले शेत';

  const systemInstruction = {
    role: 'user',
    parts: [
      {
        text: `You are 'शेतकरी मित्र AI' (Farmer Assistant), a warm, respectful, and highly competent Marathi agricultural AI assistant for farmer '${farmerName}' at farm '${farmName}'.
RULES:
1. ALWAYS respond in natural, polite, respectful Marathi (Devanagari script).
2. When the user asks ANY question about crop expenses, harvest sales, worker wages, pending payments, crops, transactions, or budget, ALWAYS call the appropriate tool to fetch live data from MongoDB.
3. NEVER invent, extrapolate, or assume financial figures. Only use exact data returned by tools.
4. If a tool returns no records (e.g. 0 amount, empty array), explain truthfully that no records exist in the database.
5. Format currency amounts in Indian format with rupee symbol (e.g. ₹1,25,000). Use bullet points and emojis where helpful.
6. Give practical, farmer-friendly explanations.`,
      },
    ],
  };

  const functionDeclarations = getGeminiFunctionDeclarations();

  // Initial user prompt
  const contents = [
    {
      role: 'user',
      parts: [{ text: query }],
    },
  ];

  // Max 5 tool turns to prevent infinite loops
  for (let turn = 0; turn < 5; turn++) {
    const payload = {
      systemInstruction,
      contents,
      tools: [{ functionDeclarations }],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error('Gemini API returned empty candidate content');
    }

    const modelParts = candidate.content.parts || [];
    contents.push(candidate.content);

    // Check if Gemini invoked one or more function calls
    const functionCallParts = modelParts.filter((p) => p.functionCall);

    if (functionCallParts.length > 0) {
      console.log(`[LLM Assistant] Gemini Tool Calls (${functionCallParts.length}):`, functionCallParts.map((p) => p.functionCall.name));

      const responseParts = [];
      for (const fcp of functionCallParts) {
        const { name, args, id } = fcp.functionCall;
        console.log(`[LLM Assistant] Executing Tool: ${name}`, args);

        // Execute tool securely for the authenticated farmer
        const toolResult = await executeTool(name, args || {}, farmerId);

        const fnResponse = {
          name,
          response: toolResult,
        };
        if (id) fnResponse.id = id;

        responseParts.push({ functionResponse: fnResponse });
      }

      // Provide all tool responses back to Gemini in a single user turn
      contents.push({
        role: 'user',
        parts: responseParts,
      });
    } else {
      // Final textual response from Gemini
      const textPart = modelParts.find((p) => p.text);
      if (textPart && textPart.text) {
        return {
          reply: textPart.text,
          modelUsed: modelName,
          provider: 'Google Gemini',
        };
      }
    }
  }

  throw new Error('Exceeded maximum tool calling turns');
}

/**
 * Execute Gemini LLM query with automatic model fallback across available candidates
 */
async function callGeminiWithTools(apiKey, query, farmerId, farmerUser) {
  const configured = getEnvVar('GEMINI_MODEL');
  const candidateModels = [
    configured || 'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
  ].filter((val, idx, self) => val && self.indexOf(val) === idx);

  let lastError = null;
  for (const modelName of candidateModels) {
    try {
      console.log(`[LLM Assistant] Trying Gemini model: ${modelName}...`);
      return await executeGeminiModelWithTools(apiKey, modelName, query, farmerId, farmerUser);
    } catch (err) {
      lastError = err;
      console.warn(`[LLM Assistant] Model ${modelName} failed (${err.message}). Trying fallback model...`);
      // Fallback on 429 quota exhaustion or 404 model not found
      if (err.message.includes('429') || err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Execute OpenAI LLM query with tool calling loop
 */
async function callOpenAIWithTools(apiKey, query, farmerId, farmerUser) {
  const modelName = getEnvVar('OPENAI_MODEL') || 'gpt-4o-mini';
  const url = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';

  const farmerName = farmerUser?.name || 'शेतकरी मित्र';
  const farmName = farmerUser?.farmName || 'आपले शेत';

  const messages = [
    {
      role: 'system',
      content: `You are 'शेतकरी मित्र AI', a respectful, helpful Marathi agricultural AI assistant for farmer '${farmerName}' at farm '${farmName}'.
RULES:
1. ALWAYS respond in natural, polite Marathi (Devanagari script).
2. When asked about expenses, sales, worker wages, crops, budget, or transactions, ALWAYS call the provided tools to query MongoDB.
3. NEVER invent numbers or financial data. Only state figures retrieved from tool execution.
4. Format currency figures with ₹ in Indian style (e.g. ₹50,000).
5. If data is not present in MongoDB, state that truthfully.`,
    },
    {
      role: 'user',
      content: query,
    },
  ];

  const tools = getOpenAITools();

  for (let turn = 0; turn < 5; turn++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        tools,
        tool_choice: 'auto',
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error('OpenAI returned empty choice message');

    messages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {}

        console.log(`[LLM Assistant] OpenAI Tool Call: ${fnName}`, fnArgs);
        const toolResult = await executeTool(fnName, fnArgs, farmerId);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    } else {
      return {
        reply: message.content || '',
        modelUsed: modelName,
        provider: 'OpenAI',
      };
    }
  }

  throw new Error('Exceeded maximum OpenAI tool calling turns');
}

/**
 * Main Entry Point: Process Farmer Question using LLM with Tool Calling + Rule-Based Fallback
 */
async function processAssistantQuery(farmerId, query, farmerUser) {
  const geminiApiKey = getEnvVar('GEMINI_API_KEY');
  const openaiApiKey = getEnvVar('OPENAI_API_KEY');

  let llmResponse = null;
  let isAiMode = false;
  let providerName = null;
  let failureReason = null;

  // 1. Try Gemini LLM if GEMINI_API_KEY is available
  if (geminiApiKey && geminiApiKey.length > 5) {
    try {
      console.log('[LLM Assistant] Processing with Google Gemini Tool Calling...');
      llmResponse = await callGeminiWithTools(geminiApiKey, query, farmerId, farmerUser);
      isAiMode = true;
      providerName = llmResponse.provider;
    } catch (err) {
      console.warn('[LLM Assistant] Gemini LLM execution failed, falling back:', err.message);
      failureReason = `Gemini: ${err.message}`;
    }
  }

  // 2. Try OpenAI LLM if OPENAI_API_KEY is available and Gemini was not used
  if (!isAiMode && openaiApiKey && openaiApiKey.length > 5) {
    try {
      console.log('[LLM Assistant] Processing with OpenAI Tool Calling...');
      llmResponse = await callOpenAIWithTools(openaiApiKey, query, farmerId, farmerUser);
      isAiMode = true;
      providerName = llmResponse.provider;
    } catch (err) {
      console.warn('[LLM Assistant] OpenAI LLM execution failed, falling back:', err.message);
      failureReason = `OpenAI: ${err.message}`;
    }
  }

  // 3. Fallback: If no AI API key is configured or API call failed, use robust rule-based engine
  if (!isAiMode || !llmResponse || !llmResponse.reply) {
    console.log('[LLM Assistant] Running in Rule-Based Engine Mode (No AI API key or fallback triggered)');
    const fallbackResult = await fallbackRuleBasedQuery(farmerId, query, farmerUser);

    let fallbackNotice = '';
    if (failureReason) {
      fallbackNotice =
        `\n\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `ℹ️ **[नियम-आधारित मोड]:** तात्पुरत्या नेटवर्क/AI सेवेच्या समस्येमुळे थेट डेटाबेस नियमांवर आधारित अचूक हिशोब दाखवला आहे. (माहिती १००% खरी आहे).`;
    } else {
      fallbackNotice =
        `\n\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `ℹ️ **[नियम-आधारित मोड]:** सध्या कोणतीही AI API Key (.env) कॉन्फिगर केलेली नाही, त्यामुळे थेट डेटाबेस नियमांवर आधारित हिशोब दिला आहे. कोणत्याही मुक्त संभाषणासाठी .env मध्ये \`GEMINI_API_KEY\` जोडू शकता.`;
    }

    const finalReply = fallbackResult.reply + fallbackNotice;
    const finalSpeech = cleanTextForSpeech(fallbackResult.reply);

    return {
      reply: finalReply,
      speechText: finalSpeech,
      intent: fallbackResult.intent,
      mode: 'rule_based_fallback',
      notice: failureReason
        ? `AI provider temporary error: ${failureReason}. Fallen back to rule-based engine.`
        : 'AI API Key is not configured in .env. Operating in rule-based database engine mode.',
      quickReplies: fallbackResult.quickReplies,
      metrics: fallbackResult.metrics,
    };
  }

  // 4. Successful LLM Mode
  const context = await getFarmerDatabaseContext(farmerId);
  const speechText = cleanTextForSpeech(llmResponse.reply);

  const quickReplies = [
    '💰 एकूण शेती खर्च किती?',
    '👷 मजुरांची बाकी मजुरी',
    '🌾 शेतमाल विक्री व उत्पन्न',
    '📊 संपूर्ण ताळेबंद व नफा',
  ];

  return {
    reply: llmResponse.reply,
    speechText,
    intent: 'llm_tool_assisted',
    mode: 'ai_tool_calling',
    provider: providerName,
    model: llmResponse.modelUsed,
    quickReplies,
    metrics: {
      totalRevenue: context.totalRevenue,
      totalCropExpenses: context.totalCropExpenses,
      totalWagesIncurred: context.totalWagesIncurred,
      pendingWorkerDues: context.pendingWorkerDues,
      netProfitLoss: context.netProfitLoss,
    },
  };
}

module.exports = {
  processAssistantQuery,
  getGeminiFunctionDeclarations,
  getOpenAITools,
};
