import { supabase } from '../supabase/client';

// Read Groq API key from environment
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Generate AI report using Groq API directly
 * @param {object} context - Structured data for analysis
 * @param {string} task - Type of analysis ('agent_report', 'archive_analysis', 'chat_response', 'weather_explanation')
 * @returns {Promise<string>} Natural language report
 */
export async function generateGroqReport(context, task = 'agent_report') {
  // Check if API key exists
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
            content: 'You are DeadlineGuard AI, a storage intelligence agent for students using Filecoin decentralized storage. You analyze storage conditions, academic deadlines, and payment balances to provide helpful recommendations. Be concise and actionable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Groq] API error:', response.status, errorText);
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

/**
 * Build prompt based on task type
 */
function buildPrompt(context, task) {
  switch (task) {
    case 'archive_analysis':
      return `Analyze these academic files and recommend which should be archived.

Files: ${JSON.stringify(context.candidates || [], null, 2)}
Protected files (do NOT archive): ${context.protectedCount || 0}
Due soon: ${context.dueSoon || 0}

Provide a concise recommendation (max 4 sentences) on which files to archive and why. Consider due dates, grade weight, and storage savings.`;

    case 'weather_explanation':
      return `Explain this Filecoin storage condition:
- Weather: ${context.weatherState || 'CLEAR'}
- Balance: $${context.balance || 0}
- Available: $${context.availableForStorage || 0}
- Runway: ${context.runway || 'unknown'} epochs
- Files stored: ${context.totalFiles || 0}

Provide 2-3 sentences explaining what this means in simple terms.`;

    case 'chat_response':
      return `User question: "${context.userQuestion}"

Current storage context:
- Balance: $${context.balance || 0}
- Available for storage: $${context.availableForStorage || 0}
- Total files: ${context.totalFiles || 0}
- Storage used: ${(context.totalStorage || 0) / (1024 * 1024)} MB
- Weather: ${context.weatherState || 'CLEAR'}

Answer the user's question concisely (max 3 sentences). Be helpful and specific to their storage situation.`;

    case 'agent_report':
    default:
      return `You are DeadlineGuard's AI agent. Summarize the current state:
- Total files: ${context.totalFiles || 0}
- Protected (due within 7 days): ${context.protectedFiles || context.protectedCount || 0}
- Archive candidates: ${context.archiveCandidates || context.archiveCount || 0}
- Balance: $${context.balance || 0}
- Available: $${context.availableForStorage || 0}
- Locked: $${context.lockedBalance || 0}
- Weather: ${context.weatherState || 'CLEAR'}

Generate a natural language report (max 4 sentences) explaining current storage conditions and recommended actions.`;
  }
}

/**
 * Fallback report when Groq API is unavailable
 */
function generateFallbackReport(context, task) {
  switch (task) {
    case 'archive_analysis':
      return `Based on analysis: ${context.candidates?.length || 0} files are archive candidates. ${context.protectedCount || 0} files are protected due to upcoming deadlines. Consider archiving completed assignments older than 3 months.`;

    case 'weather_explanation':
      const weather = context.weatherState || 'CLEAR';
      const balance = context.balance || 0;
      return `Storage conditions are ${weather}. You have $${balance.toFixed(2)} USDFC available. ${context.totalFiles || 0} files stored on Filecoin.`;

    case 'chat_response':
      return `Based on your current storage: You have $${(context.availableForStorage || 0).toFixed(2)} available, ${context.totalFiles || 0} files stored, and conditions are ${context.weatherState || 'stable'}.`;

    case 'agent_report':
    default:
      return `Agent analyzed ${context.totalFiles || 0} files. ${context.protectedCount || 0} protected, ${context.archiveCount || 0} archive candidates. Balance: $${context.balance || 0} USDFC.`;
  }
}