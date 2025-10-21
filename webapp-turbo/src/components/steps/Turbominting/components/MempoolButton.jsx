export function MempoolButton({ txid, className = '' }) {
  if (!txid) return null;

  const network = import.meta.env.VITE_BITCOIN_NETWORK || 'mainnet';
  
  const getMempoolUrl = () => {
    const baseUrl = network === 'testnet4' 
      ? 'https://mempool.space/testnet4/tx/' 
      : 'https://mempool.space/tx/';
    return `${baseUrl}${txid}`;
  };

  return (
    <a
      href={getMempoolUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={className || "px-3 py-1.5 border border-slate-500 hover:border-slate-400 text-slate-300 hover:text-slate-200 rounded text-xs font-medium transition-colors"}
    >
      View in Mempool
    </a>
  );
}
