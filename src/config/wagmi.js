import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

const filecoinCalibration = defineChain({
  id: 314159,
  name: 'Filecoin Calibration',
  network: 'filecoin-calibration',
  nativeCurrency: { name: 'tFIL', symbol: 'tFIL', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.calibration.node.glif.io/rpc/v1'] },
    public: { http: ['https://api.calibration.node.glif.io/rpc/v1'] },
  },
  blockExplorers: {
    default: { name: 'Filscan', url: 'https://calibration.filscan.io' },
  },
});

export const config = getDefaultConfig({
  appName: 'DeadlineGuard',
  projectId: '0b86090b08d3a56d2ed914b48ead4bb0', // ← Replace with your ID
  chains: [filecoinCalibration],
  ssr: false,
});