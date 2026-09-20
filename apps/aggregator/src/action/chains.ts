/**
 * Supported Ethereum-family chain IDs for Bundle Radar action layer.
 * Paper mode works without RPC keys.
 */

export interface ChainInfo {
  id: number;
  name: string;
  hex: string;
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 1, name: "Ethereum Mainnet", hex: "0x1" },
  { id: 42161, name: "Arbitrum One", hex: "0xa4b1" },
  { id: 10, name: "Optimism", hex: "0xa" },
  { id: 8453, name: "Base", hex: "0x2105" },
];

export const DEFAULT_CHAIN_ID = Number(process.env.ACTION_CHAIN_ID ?? "1");

export function resolveChainId(preferred?: number): number {
  const id = preferred ?? DEFAULT_CHAIN_ID;
  if (SUPPORTED_CHAINS.some((c) => c.id === id)) return id;
  return 1;
}
