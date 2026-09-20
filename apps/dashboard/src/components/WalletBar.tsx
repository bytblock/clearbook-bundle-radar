import { useMetaMask } from "../hooks/useMetaMask";

const SWITCH_IDS = [1, 42161, 10, 8453] as const;

export function WalletBar() {
  const { available, address, chainId, error, connect, switchChain, chains } =
    useMetaMask();

  return (
    <div className="panel wallet-bar">
      <h2>Wallet (MetaMask = identity · no KYC)</h2>
      <div className="wallet-row">
        {!address ? (
          <button
            type="button"
            className="btn"
            onClick={() => void connect()}
            disabled={!available}
          >
            {available ? "Connect MetaMask" : "No injected wallet"}
          </button>
        ) : (
          <>
            <span className="mono truncate" title={address}>
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
            <span className="badge PUBLIC">
              chainId {chainId ?? "?"}
              {chainId && chains[chainId] ? ` · ${chains[chainId].name}` : ""}
            </span>
          </>
        )}
        <div className="chain-btns">
          {SWITCH_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`btn btn-sm ${chainId === id ? "btn-active" : ""}`}
              onClick={() => void switchChain(id)}
              disabled={!address}
              title={`wallet_switchEthereumChain → ${id}`}
            >
              {id}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="err">{error}</p>}
      <p className="footnote" style={{ marginTop: 8 }}>
        Server never holds private keys. LIVE only proposes unsigned txs for
        MetaMask to sign.
      </p>
    </div>
  );
}
