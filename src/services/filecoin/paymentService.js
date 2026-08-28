import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function getPaymentStatus() {
  const synapse = getSynapse();
  
  try {
    const payments = synapse.payments;
    
    // 1. Wallet balance (MetaMask) - this is your full balance
    let walletBalance = 0;
    try {
      const walletBigInt = await payments.walletBalance({ token: 'USDFC' });
      walletBalance = parseFloat(walletBigInt.toString()) / 1e18;
      console.log('[Payment] Wallet balance (MetaMask):', walletBalance);
    } catch (e) {
      console.warn('[Payment] walletBalance failed:', e.message);
    }

    // 2. Deposited balance - ONLY from Payments contract, NO fallback
    let depositedBalance = 0;
    let lockedBalance = 0;
    let availableForStorage = 0;
    
    // Method A: getOperatorApprovals
    try {
      if (typeof payments.getOperatorApprovals === 'function') {
        const approvals = await payments.getOperatorApprovals();
        console.log('[Payment] Raw operator approvals:', approvals);
        
        if (approvals && typeof approvals === 'object') {
          // Check for lockupUsed (funds locked for storage)
          if (approvals.lockupUsed) {
            lockedBalance = parseFloat(approvals.lockupUsed.toString()) / 1e18;
          }
          if (approvals.rateUsed) {
            lockedBalance += parseFloat(approvals.rateUsed.toString()) / 1e18;
          }
          if (approvals.rateAllowance) {
            availableForStorage = parseFloat(approvals.rateAllowance.toString()) / 1e18;
          }
          if (approvals.lockupAllowance) {
            availableForStorage += parseFloat(approvals.lockupAllowance.toString()) / 1e18;
          }
          
          // Deposited = locked + available
          depositedBalance = lockedBalance + availableForStorage;
        }
      }
    } catch (e) {
      console.warn('[Payment] getOperatorApprovals failed:', e.message);
    }

    // Method B: Check accounts
    if (depositedBalance === 0) {
      try {
        if (typeof payments.accounts === 'function') {
          const account = await payments.accounts({ token: 'USDFC', owner: walletAddress });
          console.log('[Payment] Account info:', account);
          
          if (account?.funds) {
            depositedBalance = parseFloat(account.funds.toString()) / 1e18;
          }
          if (account?.lockedFunds) {
            lockedBalance = parseFloat(account.lockedFunds.toString()) / 1e18;
          }
        }
      } catch (e) {
        console.warn('[Payment] accounts failed:', e.message);
      }
    }

    console.log('[Payment] Results:', {
      walletBalance,
      depositedBalance,
      lockedBalance,
      availableForStorage,
    });

    // Spend rate
    const monthlyCost = 0.05;
    const epochsPerMonth = 86400;
    const spendRate = monthlyCost / epochsPerMonth;
    
    // Runway based on available (not wallet balance)
    const runway = spendRate > 0 && availableForStorage > 0 
      ? availableForStorage / spendRate 
      : Infinity;

    return {
      balance: walletBalance,
      depositedBalance,
      availableForStorage,
      lockedBalance,
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