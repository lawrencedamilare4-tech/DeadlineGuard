import { supabase } from '../supabase/client';

export async function generateGroqReport(context) {
  try {
    const { data, error } = await supabase.functions.invoke('groq-report', {
      body: { context },
    });
    if (error) throw error;
    return data.report;
  } catch (err) {
    console.warn('[Groq] Report generation failed:', err.message);
    return 'Unable to generate a report at this time. The agent actions are summarized in the activity log.';
  }
}