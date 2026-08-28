import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function getPaymentStatus() {
  const synapse = getSynapse();
  
  try {
    const payments = synapse.payments;
    
    // 1. Wallet balance (MetaMask)
    let walletBalance = 0;
    try {
      const walletBigInt = await payments.walletBalance({ token: 'USDFC' });
      walletBalance = parseFloat(walletBigInt.toString()) / 1e18;
      console.log('[Payment] Wallet balance:', walletBalance);
    } catch (e) {
      console.warn('[Payment] walletBalance failed:', e.message);
    }

    // 2. Deposited balance - try multiple methods
    let depositedBalance = 0;
    
    // Method A: getOperatorApprovals shows lockupUsed + rateUsed
    try {
      if (typeof payments.getOperatorApprovals === 'function') {
        const approvals = await payments.getOperatorApprovals();
        console.log('[Payment] Raw approvals:', approvals);
        
        // If approvals has funds or balance info
        if (typeof approvals === 'bigint') {
          depositedBalance = parseFloat(approvals.toString()) / 1e18;
        } else if (approvals && typeof approvals === 'object') {
          // Check for various fields
          if (approvals.funds) {
            depositedBalance = parseFloat(approvals.funds.toString()) / 1e18;
          } else if (approvals.balance) {
            depositedBalance = parseFloat(approvals.balance.toString()) / 1e18;
          } else if (approvals.depositedBalance) {
            depositedBalance = parseFloat(approvals.depositedBalance.toString()) / 1e18;
          }
        }
      }
    } catch (e) {
      console.warn('[Payment] getOperatorApprovals failed:', e.message);
    }

    // Method B: Direct account query
    if (depositedBalance === 0) {
      try {
        if (typeof payments.accounts === 'function') {
          const account = await payments.accounts({ token: 'USDFC' });
          console.log('[Payment] Account:', account);
          if (account?.funds) {
            depositedBalance = parseFloat(account.funds.toString()) / 1e18;
          }
        }
      } catch (e) {
        console.warn('[Payment] accounts failed:', e.message);
      }
    }

    // Method C: Fallback - use wallet balance as deposited
    if (depositedBalance === 0 && walletBalance > 0) {
      console.log('[Payment] Using wallet balance as deposited (fallback)');
      depositedBalance = walletBalance;
    }

    console.log('[Payment] Deposited balance:', depositedBalance);

    // 3. Spend rate estimate
    const monthlyCost = 0.05;
    const epochsPerMonth = 86400;
    const spendRate = monthlyCost / epochsPerMonth;

    // 4. Calculate available and runway
    const availableForStorage = depositedBalance;
    const runway = spendRate > 0 && availableForStorage > 0 
      ? availableForStorage / spendRate 
      : Infinity;

    console.log('[Payment] Final status:', {
      walletBalance,
      depositedBalance,
      availableForStorage,
      spendRate,
      runway,
    });

    return {
      balance: walletBalance,
      depositedBalance,
      availableForStorage,
      lockedBalance: 0,
      spendRate,
      runway,
    };
  } catch (err) {
    logger.warn('[Payment] Fetch failed:', err.message);
    return {
      balance: 0,
      depositedBalance: 0,
      availableForStorage: 0,
      lockedBalance: 0,
      spendRate: 0,
      runway: Infinity,
    };
  }
}