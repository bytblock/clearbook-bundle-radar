import { useCallback, useEffect, useState } from "react";

const CHAINS: Record<number, { hex: string; name: string }> = {
  1: { hex: "0x1", name: "Ethereum" },
  42161: { hex: "0xa4b1", name: "Arbitrum" },
  10: { hex: "0xa", name: "Optimism" },
  8453: { hex: "0x2105", name: "Base" },
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
      isMetaMask?: boolean;
    };
  }
}

export function useMetaMask() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const available = typeof window !== "undefined" && Boolean(window.ethereum);

  const refresh = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_accounts",
      })) as string[];
      setAddress(accounts[0] ?? null);
      const cid = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      setChainId(parseInt(cid, 16));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!window.ethereum?.on) return;
    const onAccounts = (accs: unknown) => {
      const a = accs as string[];
      setAddress(a[0] ?? null);
    };
    const onChain = (cid: unknown) => {
      setChainId(parseInt(String(cid), 16));
    };
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("No injected wallet (install MetaMask)");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setAddress(accounts[0] ?? null);
      const cid = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      setChainId(parseInt(cid, 16));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const switchChain = useCallback(async (id: number) => {
    setError(null);
    if (!window.ethereum) {
      setError("No injected wallet");
      return;
    }
    const info = CHAINS[id];
    if (!info) {
      setError(`Unsupported chain ${id}`);
      return;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: info.hex }],
      });
      setChainId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  /** Propose unsigned tx to MetaMask — user signs; we never hold keys. */
  const proposeTx = useCallback(
    async (tx: { to: string; data: string; value: string; chainId: number }) => {
      setError(null);
      if (!window.ethereum || !address) {
        setError("Connect MetaMask first");
        return null;
      }
      if (chainId !== tx.chainId) {
        await switchChain(tx.chainId);
      }
      try {
        const hash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: address,
              to: tx.to,
              data: tx.data,
              value: tx.value,
            },
          ],
        });
        return String(hash);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [address, chainId, switchChain]
  );

  return {
    available,
    address,
    chainId,
    error,
    connect,
    switchChain,
    proposeTx,
    chains: CHAINS,
  };
}
