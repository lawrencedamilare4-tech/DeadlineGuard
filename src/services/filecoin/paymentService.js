import { getSynapse, getWalletAddress } from './synapseService';
import { ethers } from 'ethers';
import { logger } from '../../utils/logger';

// Filecoin Calibration contract addresses
const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';
const PAYMENTS_ADDRESS = '0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0';

// Payments contract ABI (from your SDK config)
const PAYMENTS_ABI = [
  'function accounts(address token, address owner) view returns (uint256 funds, uint256 lockedFunds, bool frozen)',
  'function operatorApprovals(address token, address client, address operator) view returns (bool isApproved, uint256 rateAllowance, uint256 rateUsed, uint256 lockupAllowance, uint256 lockupUsed)',
];

export async function getPaymentStatus() {
  const synapse = getSynapse();
  
  try {
    const payments = synapse.payments;
    const address = getWalletAddress();

    // 1. MetaMask wallet balance
    let walletBalance = 0;
    try {
      const walletBigInt = await payments.walletBalance({ token: 'USDFC' });
      walletBalance = parseFloat(walletBigInt.toString()) / 1e18;
    } catch (e) {
      console.warn('[Payment] walletBalance failed:', e.message);
    }

    // 2. Query Payments contract directly using ethers
    let depositedBalance = 0;
    let lockedBalance = 0;

    try {
      if (!window.ethereum) throw new Error('No provider');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const paymentsContract = new ethers.Contract(PAYMENTS_ADDRESS, PAYMENTS_ABI, provider);

      // Get account info (funds + lockedFunds)
      const accountInfo = await paymentsContract.accounts(USDFC_ADDRESS, address);
      console.log('[Payment] Contract accounts:', accountInfo);

      if (accountInfo) {
        depositedBalance = parseFloat(accountInfo.funds.toString()) / 1e18;
        lockedBalance = parseFloat(accountInfo.lockedFunds.toString()) / 1e18;
      }

      console.log('[Payment] From contract:', {
        deposited: depositedBalance,
        locked: lockedBalance,
      });

    } catch (contractErr) {
      console.warn('[Payment] Contract query failed:', contractErr.message);
    }

    // Available = deposited - locked
    const availableForStorage = Math.max(0, depositedBalance - lockedBalance);

    // Spend rate
    const monthlyCost = 0.05;
    const epochsPerMonth = 86400;
    const spendRate = monthlyCost / epochsPerMonth;

    // Runway
    const runway = spendRate > 0 && availableForStorage > 0 
      ? availableForStorage / spendRate 
      : Infinity;

    console.log('[Payment] FINAL:', {
      walletBalance,
      depositedBalance,
      lockedBalance,
      availableForStorage,
    });

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