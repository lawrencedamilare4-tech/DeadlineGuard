import { supabase } from '../supabase/client';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function generateGroqReport(context, task = 'agent_report') {
  if (!GROQ_API_KEY) {
    console.warn('[Groq] No API key found. Add VITE_GROQ_API_KEY to .env');
    return generateFallbackReport(context, task);
  }

  try {
    const prompt = buildPrompt(context, task);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are DeadlineGuard AI, a storage intelligence agent for students using Filecoin. Be concise. Always respond in EXACTLY 3 sentences. No more, no less.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return generateFallbackReport(context, task);
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content || generateFallbackReport(context, task);
    
    return report;
  } catch (err) {
    console.warn('[Groq] API call failed:', err.message);
    return generateFallbackReport(context, task);
  }
}

function buildPrompt(context, task) {
  switch (task) {
    case 'archive_analysis':
      return `Analyze these academic files and recommend archiving.

Files: ${JSON.stringify(context.candidates || [], null, 2)}
Protected: ${context.protectedCount || 0}
Due soon: ${context.dueSoon || 0}

Respond in EXACTLY 3 sentences.`;

    case 'weather_explanation':
      return `Explain this storage condition:
- Weather: ${context.weatherState}
- Balance: $${context.balance}
- Available: $${context.availableForStorage}
- Files: ${context.totalFiles}

Respond in EXACTLY 3 sentences.`;

    case 'chat_response':
      return `User question: "${context.userQuestion}"

Context:
- Balance: $${context.balance || 0}
- Available: $${context.availableForStorage || 0}
- Files: ${context.totalFiles || 0}
- Storage: ${(context.totalStorage || 0) / (1024 * 1024)} MB

Answer in EXACTLY 3 sentences.`;

    case 'agent_report':
    default:
      return `Summarize storage conditions:
- Files: ${context.totalFiles || 0}
- Protected: ${context.protectedFiles || context.protectedCount || 0}
- Archive: ${context.archiveCandidates || context.archiveCount || 0}
- Balance: $${context.balance || 0}
- Available: $${context.availableForStorage || 0}
- Weather: ${context.weatherState || 'CLEAR'}

Respond in EXACTLY 3 sentences.`;
  }
}

function generateFallbackReport(context, task) {
  switch (task) {
    case 'archive_analysis':
      return `${context.candidates?.length || 0} files are archive candidates ready for archival. ${context.protectedCount || 0} files are protected due to upcoming deadlines. Consider archiving completed assignments to free up storage.`;

    case 'weather_explanation':
      return `Your storage conditions are ${context.weatherState || 'stable'}. You have $${(context.balance || 0).toFixed(2)} USDFC with $${(context.availableForStorage || 0).toFixed(2)} available. ${context.totalFiles || 0} files are stored on Filecoin.`;

    case 'chat_response':
      return `You currently have $${(context.availableForStorage || 0).toFixed(2)} available for storage. ${context.totalFiles || 0} files are stored using ${(context.totalStorage || 0) / (1024 * 1024)} MB of space. Your storage conditions are ${context.weatherState || 'stable'}.`;

    case 'agent_report':
    default:
      return `Agent analyzed ${context.totalFiles || 0} files with ${context.protectedCount || 0} protected and ${context.archiveCount || 0} archive candidates. Your balance is $${(context.balance || 0).toFixed(2)} USDFC. Storage conditions are ${context.weatherState || 'CLEAR'}.`;
  }
}