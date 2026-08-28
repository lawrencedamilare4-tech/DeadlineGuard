import { getSynapse } from './synapseService';
import { logger } from '../../utils/logger';

export async function getPaymentStatus() {
  const synapse = getSynapse();
  
  try {
    const payments = synapse.payments;
    
    // 1. MetaMask wallet balance (tokens in wallet, not deposited)
    let walletBalance = 0;
    try {
      const walletBigInt = await payments.walletBalance({ token: 'USDFC' });
      walletBalance = parseFloat(walletBigInt.toString()) / 1e18;
    } catch (e) {
      console.warn('[Payment] Wallet balance failed:', e.message);
    }

    // 2. Deposited balance (funds in Payments contract for storage)
    let depositedBalance = 0;
    try {
      // Try different method names
      if (typeof payments.getDepositedBalance === 'function') {
        const depositedBigInt = await payments.getDepositedBalance({ token: 'USDFC' });
        depositedBalance = parseFloat(depositedBigInt.toString()) / 1e18;
      } else if (typeof payments.getAccountBalance === 'function') {
        const accountBigInt = await payments.getAccountBalance({ token: 'USDFC' });
        depositedBalance = parseFloat(accountBigInt.toString()) / 1e18;
      } else if (typeof payments.getFunds === 'function') {
        const fundsBigInt = await payments.getFunds({ token: 'USDFC' });
        depositedBalance = parseFloat(fundsBigInt.toString()) / 1e18;
      } else {
        console.log('[Payment] No deposited balance method found');
        console.log('[Payment] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(payments)));
      }
    } catch (e) {
      console.warn('[Payment] Deposited balance failed:', e.message);
    }

    // 3. Operator approvals (shows what's locked/allocated)
    let lockedBalance = 0;
    let rateAllowance = 0;
    let lockupAllowance = 0;
    try {
      if (typeof payments.getOperatorApprovals === 'function') {
        const approvals = await payments.getOperatorApprovals();
        console.log('[Payment] Operator approvals:', approvals);
        
        if (approvals) {
          if (typeof approvals.rateUsed === 'bigint') lockedBalance += parseFloat(approvals.rateUsed.toString()) / 1e18;
          if (typeof approvals.lockupUsed === 'bigint') lockedBalance += parseFloat(approvals.lockupUsed.toString()) / 1e18;
          if (typeof approvals.rateAllowance === 'bigint') rateAllowance = parseFloat(approvals.rateAllowance.toString()) / 1e18;
          if (typeof approvals.lockupAllowance === 'bigint') lockupAllowance = parseFloat(approvals.lockupAllowance.toString()) / 1e18;
        }
      }
    } catch (e) {
      console.warn('[Payment] Operator approvals failed:', e.message);
    }

    console.log('[Payment] Full status:', {
      walletBalance,
      depositedBalance,
      lockedBalance,
      rateAllowance,
      lockupAllowance,
    });

    // Use deposited balance as the "available for storage" amount
    const availableForStorage = Math.max(0, depositedBalance - lockedBalance);
    
    const monthlyCost = 0.05;
    const epochsPerMonth = 86400;
    const spendRate = monthlyCost / epochsPerMonth;
    const runway = spendRate > 0 ? availableForStorage / spendRate : Infinity;

    return {
      balance: walletBalance,
      depositedBalance,
      lockedBalance,
      availableForStorage,
      spendRate,
      runway,
    };
  } catch (err) {
    logger.warn('[Payment] Fetch failed:', err.message);
    return {
      balance: 0,
      depositedBalance: 0,
      lockedBalance: 0,
      availableForStorage: 0,
      spendRate: 0,
      runway: Infinity,
    };
  }
}