import { createClient } from 'npm:@supabase/supabase-js@2';
import Groq from 'npm:groq-sdk';

const groq = new Groq({ apiKey: Deno.env.get('GROQ_API_KEY') });

Deno.serve(async (req) => {
  const { context } = await req.json();

  const prompt = `
You are DeadlineGuard's weather reporter. Based on the following Filecoin and academic state, generate a concise, student-friendly explanation of what happened and what the agent did.

Context:
${JSON.stringify(context, null, 2)}

Return a natural language paragraph (max 5 sentences).
`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama3-8b-8192',
  });

  const report = completion.choices[0]?.message?.content || 'No report generated.';

  return new Response(
    JSON.stringify({ report }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});