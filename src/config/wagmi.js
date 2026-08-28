import { http, createConfig } from 'wagmi';
import { calibration } from '@filoz/synapse-core/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [calibration],
  connectors: [injected()],
  transports: {
    [calibration.id]: http('https://api.calibration.node.glif.io/rpc/v1'),
  },
});