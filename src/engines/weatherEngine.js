export const WEATHER_STATES = {
  CLEAR: 'CLEAR',
  WATCH: 'WATCH',
  RAIN: 'RAIN',
  STORM: 'STORM',
  CRITICAL: 'CRITICAL',
};

export function calculateWeather(metrics) {
  const { storageUtilization, runwayEpochs, providerHealth, pdpStatus, upcomingDemand } = metrics;

  console.log('[Weather] Metrics received:', {
    storageUtilization,
    runwayEpochs,
    providerHealth,
    pdpStatus,
  });

  // Safe runway: treat Infinity/null/undefined as very large
  const effectiveRunway = runwayEpochs === Infinity || runwayEpochs === null || runwayEpochs === undefined || isNaN(runwayEpochs)
    ? 999999
    : Number(runwayEpochs);

  // Safe provider health: default to 1 (healthy) if invalid
  const effectiveHealth = providerHealth === null || providerHealth === undefined || isNaN(providerHealth)
    ? 1
    : Math.max(0, Math.min(1, providerHealth));

  // Safe storage utilization
  const effectiveUtilization = storageUtilization === null || storageUtilization === undefined || isNaN(storageUtilization)
    ? 0
    : Math.max(0, Math.min(1, storageUtilization));

  console.log('[Weather] Effective values:', {
    effectiveRunway,
    effectiveHealth,
    effectiveUtilization,
  });

  let state = WEATHER_STATES.CLEAR;
  let description = 'Clear skies. Storage healthy.';

  // CRITICAL only if truly bad conditions
  if (effectiveRunway <= 3 || effectiveUtilization > 95 || effectiveHealth < 0.5) {
    state = WEATHER_STATES.CRITICAL;
    description = 'Critical storage condition. Immediate action required.';
  } else if (effectiveRunway <= 6 || effectiveUtilization > 85 || effectiveHealth < 0.75) {
    state = WEATHER_STATES.STORM;
    description = 'Storm conditions. Storage pressure significant.';
  } else if (effectiveRunway <= 10 || effectiveUtilization > 70 || effectiveHealth < 0.9) {
    state = WEATHER_STATES.RAIN;
    description = 'Rain. Storage pressure increasing.';
  } else if (effectiveRunway <= 14 || effectiveUtilization > 60) {
    state = WEATHER_STATES.WATCH;
    description = 'Watch. Conditions deteriorating.';
  }

  console.log('[Weather] Final state:', state);
  return { state, description };
}