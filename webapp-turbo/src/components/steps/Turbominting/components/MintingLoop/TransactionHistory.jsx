import { useState } from 'react';
import { OUTPUT_STATUS } from './constants.js';

export function TransactionHistory({ outputsProgress }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case OUTPUT_STATUS.COMPLETED:
        return '✅';
      case OUTPUT_STATUS.FAILED:
        return '❌';
      case OUTPUT_STATUS.PROCESSING:
        return '⏳';
      default:
        return '⏸️';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case OUTPUT_STATUS.COMPLETED:
        return 'text-emerald-400 bg-emerald-900/20 border-emerald-600/30';
      case OUTPUT_STATUS.FAILED:
        return 'text-red-400 bg-red-900/20 border-red-600/30';
      case OUTPUT_STATUS.PROCESSING:
        return 'text-blue-400 bg-blue-900/20 border-blue-600/30';
      default:
        return 'text-slate-400 bg-slate-800/50 border-slate-600/30';
    }
  };

  const formatTxid = (txid) => {
    if (!txid) return 'N/A';
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const openInExplorer = (txid) => {
    const network = import.meta.env.VITE_NETWORK || 'testnet4';
    const baseUrl = network === 'mainnet' 
      ? 'https://mempool.space/tx/' 
      : 'https://mempool.space/testnet4/tx/';
    window.open(`${baseUrl}${txid}`, '_blank');
  };

  if (!outputsProgress || outputsProgress.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
      {outputsProgress.map((output, index) => (
        <div
          key={index}
          className={`border rounded-lg overflow-hidden transition-all ${getStatusColor(output.status)}`}
        >
          {/* Header */}
          <div
            className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getStatusIcon(output.status)}</span>
                <div>
                  <h3 className="font-semibold">
                    Output #{index + 1}
                  </h3>
                  <p className="text-xs opacity-75">
                    {output.status === OUTPUT_STATUS.COMPLETED && 'Minted successfully'}
                    {output.status === OUTPUT_STATUS.FAILED && `Failed: ${output.error?.substring(0, 50)}...`}
                    {output.status === OUTPUT_STATUS.PROCESSING && 'Processing...'}
                    {output.status === OUTPUT_STATUS.PENDING && 'Pending'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {output.commitTxid && (
                  <span className="text-xs px-2 py-1 bg-black/20 rounded">
                    2 TXs
                  </span>
                )}
                <span className="text-lg">
                  {expandedIndex === index ? '▼' : '▶'}
                </span>
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expandedIndex === index && (
            <div className="border-t border-current/20 p-4 space-y-4 bg-black/20">
              {/* Mining UTXO */}
              {output.miningUtxo && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold opacity-75">Mining UTXO (Input)</h4>
                  <div className="bg-black/30 rounded p-3 space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="opacity-75">TXID:</span>
                      <div className="flex items-center gap-2">
                        <span>{formatTxid(output.miningUtxo.txid)}</span>
                        <button
                          onClick={() => copyToClipboard(output.miningUtxo.txid)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                          title="Copy full txid"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="opacity-75">Vout:</span>
                      <span>{output.miningUtxo.vout}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="opacity-75">Amount:</span>
                      <span>{output.miningUtxo.amount} sats</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Funding UTXO */}
              {output.fundingUtxo && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold opacity-75">Funding UTXO (Input)</h4>
                  <div className="bg-black/30 rounded p-3 space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="opacity-75">TXID:</span>
                      <div className="flex items-center gap-2">
                        <span>{formatTxid(output.fundingUtxo.txid)}</span>
                        <button
                          onClick={() => copyToClipboard(output.fundingUtxo.txid)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                          title="Copy full txid"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="opacity-75">Vout:</span>
                      <span>{output.fundingUtxo.vout}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="opacity-75">Amount:</span>
                      <span>{output.fundingUtxo.amount} sats</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Commit Transaction */}
              {output.commitTxid && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold opacity-75">Commit Transaction</h4>
                  <div className="bg-black/30 rounded p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="opacity-75">TXID:</span>
                      <div className="flex items-center gap-2">
                        <span>{formatTxid(output.commitTxid)}</span>
                        <button
                          onClick={() => copyToClipboard(output.commitTxid)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                          title="Copy full txid"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => openInExplorer(output.commitTxid)}
                          className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs"
                          title="View in explorer"
                        >
                          🔍
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Spell Transaction */}
              {output.spellTxid && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold opacity-75">Spell Transaction (Token Mint)</h4>
                  <div className="bg-black/30 rounded p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="opacity-75">TXID:</span>
                      <div className="flex items-center gap-2">
                        <span>{formatTxid(output.spellTxid)}</span>
                        <button
                          onClick={() => copyToClipboard(output.spellTxid)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                          title="Copy full txid"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => openInExplorer(output.spellTxid)}
                          className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs"
                          title="View in explorer"
                        >
                          🔍
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {output.status === OUTPUT_STATUS.FAILED && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-red-400">❌ Error Details</h4>
                  
                  {/* Failed Step */}
                  {output.currentSubStep && (
                    <div className="bg-red-950/30 border border-red-600/30 rounded p-2">
                      <div className="text-xs text-red-300 font-semibold mb-1">Failed at step:</div>
                      <div className="text-red-200 text-sm">{output.currentSubStep}</div>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  <div className="bg-red-950/50 border border-red-600/30 rounded p-3">
                    <div className="text-xs text-red-300 font-semibold mb-2">Error message:</div>
                    <div className="text-red-200 text-xs font-mono break-all">
                      {output.error?.message || output.error || 'Unknown error'}
                    </div>
                  </div>

                  {/* Download Payload Button */}
                  {output.payload && (
                    <button
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(output.payload, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `payload-output-${output.index + 1}-failed.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-semibold transition-colors"
                    >
                      💾 Download Failed Payload for Debugging
                    </button>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs opacity-50 space-y-1">
                {output.createdAt && (
                  <div>Created: {new Date(output.createdAt).toLocaleString()}</div>
                )}
                {output.updatedAt && (
                  <div>Updated: {new Date(output.updatedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
