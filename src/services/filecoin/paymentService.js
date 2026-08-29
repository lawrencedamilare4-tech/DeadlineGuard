import { ethers } from 'ethers';

const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';
const PAYMENTS_ADDRESS = '0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0';
const RPC_URL = 'https://api.calibration.node.glif.io/rpc/v1';

const USDFC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const PAYMENTS_ABI = [
  'function accounts(address token, address owner) view returns (uint256 funds, uint256 lockedFunds, bool frozen)',
];

export async function getPaymentStatus(address) {
  try {
    if (!address) {
      return {
        balance: 0,
        depositedBalance: 0,
        availableForStorage: 0,
        lockedBalance: 0,
        spendRate: 0,
        runway: Infinity,
      };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const usdfcContract = new ethers.Contract(USDFC_ADDRESS, USDFC_ABI, provider);
    const paymentsContract = new ethers.Contract(PAYMENTS_ADDRESS, PAYMENTS_ABI, provider);

    // Wallet USDFC balance
    const walletBalanceWei = await usdfcContract.balanceOf(address);
    const walletBalance = parseFloat(ethers.formatUnits(walletBalanceWei, 18));

    // Deposited funds and locked funds in Payments contract
    const accountInfo = await paymentsContract.accounts(USDFC_ADDRESS, address);
    const deposited = parseFloat(ethers.formatUnits(accountInfo.funds, 18));
    const locked = parseFloat(ethers.formatUnits(accountInfo.lockedFunds, 18));
    const available = Math.max(0, deposited - locked);

    // Rough spend rate and runway
    const spendRate = 0.05 / 86400; // $0.05 per month per epoch
    const runway = available > 0 ? available / spendRate : Infinity;

    return {
      balance: walletBalance,
      depositedBalance: deposited,
      availableForStorage: available,
      lockedBalance: locked,
      spendRate,
      runway,
    };
  } catch (err) {
    console.warn('[Payment] Direct query failed:', err.message);
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