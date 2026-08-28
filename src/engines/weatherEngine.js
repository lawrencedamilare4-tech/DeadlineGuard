export const WEATHER_STATES = {
  CLEAR: 'CLEAR',
  WATCH: 'WATCH',
  RAIN: 'RAIN',
  STORM: 'STORM',
  CRITICAL: 'CRITICAL',
};

export function calculateWeather(metrics) {
  const { storageUtilization, availableForStorage, depositedBalance, totalFiles } = metrics;

  console.log('[Weather] Metrics:', { storageUtilization, availableForStorage, depositedBalance, totalFiles });

  // Use DEPOSITED balance (not wallet balance) for weather
  const effectiveBalance = availableForStorage ?? depositedBalance ?? 0;

  let state = WEATHER_STATES.CLEAR;
  let description = 'Clear skies. Storage healthy.';

  // Weather based on DEPOSITED balance
  if (effectiveBalance <= 0.01) {
    state = WEATHER_STATES.CRITICAL;
    description = 'Critical: No available funds. Deposit USDFC to continue storing files.';
  } else if (effectiveBalance < 0.10) {
    state = WEATHER_STATES.STORM;
    description = `Storm: Only $${effectiveBalance.toFixed(2)} available. Not enough for another upload.`;
  } else if (effectiveBalance < 0.50) {
    state = WEATHER_STATES.RAIN;
    description = `Rain: $${effectiveBalance.toFixed(2)} available. Deposit more for multiple uploads.`;
  } else if (effectiveBalance < 1.00) {
    state = WEATHER_STATES.WATCH;
    description = `Watch: $${effectiveBalance.toFixed(2)} available. Consider topping up.`;
  } else {
    state = WEATHER_STATES.CLEAR;
    description = `Clear: $${effectiveBalance.toFixed(2)} available for storage.`;
  }

  // Adjust for storage utilization
  if (storageUtilization > 0.9 && state === WEATHER_STATES.CLEAR) {
    state = WEATHER_STATES.WATCH;
    description = 'Watch: Storage nearly full.';
  }

  console.log('[Weather] State:', state, description);

  return { state, description };
}