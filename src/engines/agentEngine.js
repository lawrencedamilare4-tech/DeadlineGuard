import { supabase } from '../services/supabase/client';
import { FilecoinService } from '../services/filecoin';
import { calculateWeather, WEATHER_STATES } from './weatherEngine';
import { logger } from '../utils/logger';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Main agent loop: observe, analyze, protect, optimize, act, verify, report.
 * @param {string} userId
 */
export async function runAgent(userId) {
  logger.info('[Agent] Starting observation');

  // OBSERVE: fetch all data
  const { files, payments, storage } = await observeState(userId);

  // ANALYZE: compute weather metrics
  const metrics = await calculateMetrics(userId, files, payments, storage);
  const weather = calculateWeather(metrics);
  logger.info('[Agent] Weather state:', weather.state);

  // If weather is clear or watch, just report and exit
  if (weather.state === WEATHER_STATES.CLEAR || weather.state === WEATHER_STATES.WATCH) {
    await saveWeatherReport(userId, weather);
    return weather;
  }

  // STORM DETECTED: protect and archive
  const protectedFiles = [];
  const archiveCandidates = [];

  for (const file of files) {
    // Skip already archived files
    if (file.status === 'archived') continue;

    const isProtected = isDeadlineProtected(file) || file.priority_score > 0.7;
    if (isProtected && file.status !== 'protected') {
      await updateFileStatus(file.id, 'protected');
      await logAgentAction(userId, 'PROTECT', `Protected ${file.file_name}`, file.id);
      protectedFiles.push(file);
      logger.info(`[Agent] Protected file: ${file.file_name}`);
    } else if (!isProtected && isArchiveCandidate(file)) {
      archiveCandidates.push(file);
    }
  }

  // ARCHIVE eligible candidates (logical archive, data remains on Filecoin)
  for (const candidate of archiveCandidates) {
    // 7‑day protection rule: never archive if due date within 7 days
    if (candidate.assignment?.due_date) {
      const dueMs = new Date(candidate.assignment.due_date).getTime();
      if (Date.now() + SEVEN_DAYS_MS > dueMs) continue;
    }
    await updateFileStatus(candidate.id, 'archived');
    await logAgentAction(userId, 'ARCHIVE', `Archived ${candidate.file_name}`, candidate.id);
    logger.info(`[Agent] Archived file: ${candidate.file_name}`);
  }

  // VERIFY storage after actions
  await verifyStorage(userId, files);

  // RE-CALCULATE weather after actions
  const newWeather = await recalculateWeather(userId);
  await saveWeatherReport(userId, newWeather);
  logger.info('[Agent] Run completed', newWeather);

  return newWeather;
}

// ------- Helper functions (implementation) -------

async function observeState(userId) {
  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('*, assignment:assignments(*)')
    .eq('user_id', userId);

  const { data: payments, error: paymentsError } = await supabase
    .from('storage_payments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: storage, error: storageError } = await supabase
    .from('filecoin_storage')
    .select('*')
    .eq('user_id', userId);

  if (filesError || paymentsError || storageError) {
    throw new Error(`Observe failed: ${filesError?.message || paymentsError?.message || storageError?.message}`);
  }

  return { files: files ?? [], payments: payments ?? null, storage: storage ?? [] };
}

async function calculateMetrics(userId, files, payments, storage) {
  const storageUtilization = calculateStorageUtilization(storage);
  const providerHealth = calculateProviderHealth(storage);
  const runwayEpochs = payments?.estimated_runway ?? 0;
  const upcomingDemand = calculateUpcomingDemand(files);

  return {
    storageUtilization,
    runwayEpochs,
    providerHealth,
    pdpStatus: 'VERIFIED', // from storage data if available
    upcomingDemand,
  };
}

function calculateStorageUtilization(storageData) {
  if (!storageData.length) return 0;
  const used = storageData.reduce((sum, row) => sum + (row.storage_size ?? 0), 0);
  const total = storageData.reduce((sum, row) => sum + (row.storage_size ?? 0), 0) || 1; // simplified
  return Math.min(1, used / total);
}

function calculateProviderHealth(storageData) {
  if (!storageData.length) return 1;
  const healthy = storageData.filter(row => row.pdp_status === 'VERIFIED').length;
  return healthy / storageData.length;
}

function calculateUpcomingDemand(files) {
  // Files that are active and large or due soon create demand
  const upcoming = files.filter(f => {
    if (f.assignment?.due_date) {
      const dueMs = new Date(f.assignment.due_date).getTime();
      return dueMs - Date.now() < SEVEN_DAYS_MS && f.status === 'active';
    }
    return false;
  });
  return upcoming.length / Math.max(files.length, 1);
}

function isDeadlineProtected(file) {
  if (!file.assignment?.due_date) return false;
  const dueMs = new Date(file.assignment.due_date).getTime();
  return dueMs - Date.now() < SEVEN_DAYS_MS;
}

function isArchiveCandidate(file) {
  // Basic heuristic: completed (assignment status = completed), cold temperature, large size
  return (
    file.assignment?.status === 'completed' ||
    (file.temperature === 'cold' && file.file_size > 500 * 1024 * 1024) // >500MB
  );
}

async function updateFileStatus(fileId, status) {
  await supabase.from('files').update({ status }).eq('id', fileId);
}

async function logAgentAction(userId, type, description, fileId = null) {
  await supabase.from('agent_actions').insert({
    user_id: userId,
    action_type: type,
    description,
    file_id: fileId,
  });
}

async function saveWeatherReport(userId, weather) {
  await supabase.from('weather_reports').insert({
    user_id: userId,
    weather_state: weather.state,
    details: weather,
  });
}

async function verifyStorage(userId, files) {
  for (const file of files) {
    if (file.piece_cid) {
      try {
        const verification = await FilecoinService.getVerificationStatus(file.piece_cid);
        if (verification.status === 'VERIFIED') {
          await logAgentAction(userId, 'VERIFY', `Verified ${file.file_name}`, file.id);
        } else {
          await logAgentAction(userId, 'ALERT', `Verification failed for ${file.file_name}`, file.id);
        }
      } catch (err) {
        logger.warn('[Agent] Verification check failed', err.message);
      }
    }
  }
}

async function recalculateWeather(userId) {
  const { files, payments, storage } = await observeState(userId);
  const metrics = await calculateMetrics(userId, files, payments, storage);
  return calculateWeather(metrics);
}