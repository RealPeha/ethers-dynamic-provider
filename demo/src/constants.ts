import {
  DynamicStrategy,
  FallbackStrategy,
  FastestStrategy,
  HighestBlockStrategy,
  RandomStrategy,
  SequentialStrategy,
} from "ethers-dynamic-provider";

export const strategies = {
  fallback: {
    name: "Fallback",
    create: () => new FallbackStrategy(),
  },
  sequential: {
    name: "Sequential",
    create: () => new SequentialStrategy(),
  },
  random: {
    name: "Random",
    create: () => new RandomStrategy(),
  },
  fastest: {
    name: "Fastest",
    create: () => new FastestStrategy(),
  },
  dynamic: {
    name: "Dynamic",
    create: () => new DynamicStrategy(),
  },
  highestBlock: {
    name: "Highest Block",
    create: () =>
      new HighestBlockStrategy({
        syncInterval: 2_500,
      }),
  },
};

export type StrategyId = keyof typeof strategies;

// export const rpcs = [
//   // "https://arb1.arbitrum.io/rpc",
//   "https://arb-mainnet.g.alchemy.com/v2/demo",
//   "https://arb-mainnet-public.unifra.io",
//   "https://rpc.arb1.arbitrum.gateway.fm",
//   "https://arbitrum.meowrpc.com",
//   "https://arbitrum-one.public.blastapi.io",
//   "https://1rpc.io/arb",
//   "https://rpc.ankr.com/arbitrum",
//   "https://arb-pokt.nodies.app",
//   "https://arbitrum.blockpi.network/v1/rpc/public",
//   "https://api.zan.top/arb-one",
//   "https://arbitrum-one-rpc.publicnode.com",
//   "https://arbitrum.drpc.org",
//   "https://public.stackup.sh/api/v1/node/arbitrum-one",
// ];

export const rpcs = [
  "https://eth.rpc.blxrbdn.com",
  "https://eth1.lava.build",
  "https://eth.drpc.org",
  "https://singapore.rpc.blxrbdn.com",
  "https://endpoints.omniatech.io/v1/eth/mainnet/public",
  "https://eth.llamarpc.com",
  "https://rpc.mevblocker.io",
  "https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7",
  "https://virginia.rpc.blxrbdn.com",
  "https://1rpc.io/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://api.securerpc.com/v1",
  "https://mainnet.gateway.tenderly.co",
  "https://eth.merkle.io",
  "https://0xrpc.io/eth",
];
