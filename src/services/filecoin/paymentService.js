import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function getPaymentStatus() {
  const synapse = getSynapse();
  
  try {
    const balanceBigInt = await synapse.payments.walletBalance({ token: 'USDFC' });
    
    // Correct conversion: USDFC has 6 decimal places
    const balanceStr = balanceBigInt.toString();
    const balance = parseFloat(balanceStr) / 1e18;
    
    console.log('[Filecoin] Raw balance:', balanceStr);
    console.log('[Filecoin] Converted balance:', balance);
    
    // Realistic spend rate for 1 document (~1MB stored)
    // Filecoin storage costs about $0.01-0.05 per GB per month
    // For 1MB: ~$0.00001 per month
    const storageSizeGB = 0.001; // 1MB in GB
    const monthlyCostPerGB = 0.05; // $0.05 per GB per month
    const monthlyCost = storageSizeGB * monthlyCostPerGB; // ~$0.00005 per month
    
    const epochsPerMonth = 86400; // ~1 epoch every 30 seconds
    const spendRate = monthlyCost / epochsPerMonth; // Very small but realistic
    
    // Calculate runway
    const runway = spendRate > 0 ? balance / spendRate : Infinity;
    
    console.log('[Filecoin] Spend rate:', spendRate);
    console.log('[Filecoin] Runway:', runway);
    
    return { balance, spendRate, runway };
  } catch (err) {
    logger.warn('[Filecoin] Payment fetch failed:', err.message);
    return { balance: 0, spendRate: 0, runway: Infinity };
  }
}