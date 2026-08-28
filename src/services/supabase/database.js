import { supabase } from './client';

// Generic fetch helpers
export async function fetchFiles(userId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchFileById(fileId) {
  const { data, error } = await supabase
    .from('files')
    .select('*, filecoin_storage(*), filecoin_providers(*)')
    .eq('id', fileId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPayments(userId) {
  const { data, error } = await supabase
    .from('storage_payments')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function fetchStorageInfo(userId) {
  const { data, error } = await supabase
    .from('filecoin_storage')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAgentActions(userId, limit = 20) {
  const { data, error } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchWeatherReports(userId, limit = 5) {
  const { data, error } = await supabase
    .from('weather_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function insertFileMetadata(metadata) {
  const { data, error } = await supabase
    .from('files')
    .insert(metadata)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertFilecoinStorage(storageDetails) {
  const { data, error } = await supabase
    .from('filecoin_storage')
    .insert(storageDetails)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertProviderRecord(provider) {
  const { data, error } = await supabase
    .from('filecoin_providers')
    .insert(provider)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFileStatus(fileId, status) {
  const { data, error } = await supabase
    .from('files')
    .update({ status })
    .eq('id', fileId);
  if (error) throw error;
  return data;
}

export async function logAgentAction(action) {
  const { data, error } = await supabase
    .from('agent_actions')
    .insert(action);
  if (error) throw error;
  return data;
}

export async function saveWeatherReport(report) {
  const { data, error } = await supabase
    .from('weather_reports')
    .insert(report);
  if (error) throw error;
  return data;
}

export async function updatePaymentInfo(paymentInfo, userId) {
  const { data, error } = await supabase
    .from('storage_payments')
    .upsert({ user_id: userId, ...paymentInfo }, { onConflict: 'user_id' });
  if (error) throw error;
  return data;
}

// Add to src/services/supabase/database.js
export async function fetchFileActivities(fileId, limit = 10) {
  const { data, error } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('file_id', fileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}