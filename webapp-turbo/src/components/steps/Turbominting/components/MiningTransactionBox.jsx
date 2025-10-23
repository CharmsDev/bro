import { MempoolButton } from './MempoolButton.jsx';

export function MiningTransactionBox({ 
  turbominingData, 
  isBroadcasting, 
  broadcastError,
  isMonitoring,
  confirmationInfo
}) {
  return (
    <div className="box-section bg-slate-900/60 border border-slate-600 rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-2xl font-bold text-purple-300">
          📡 1. Mining Transaction
        </h3>
        
        {isMonitoring && turbominingData.miningTxid && !turbominingData.miningTxConfirmed && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
            <span className="text-yellow-400 text-sm font-semibold">Monitoring...</span>
          </div>
        )}
      </div>
      
      <div className="box-content">
        {/* Broadcasting State */}
        {isBroadcasting && !turbominingData.miningTxid && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="text-purple-400 font-semibold">Broadcasting to network...</span>
            </div>
          </div>
        )}

        {/* Broadcast Error */}
        {broadcastError && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
            <p className="text-red-400 text-sm mb-2">❌ Broadcast failed: {broadcastError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Transaction Broadcasted */}
        {turbominingData.miningTxid && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <span className="text-slate-400 text-sm block mb-2">Transaction ID:</span>
            <p className="text-emerald-400 font-mono text-sm break-all mb-3">
              {turbominingData.miningTxid}
            </p>
            
            {/* Buttons */}
            <div className="flex gap-2">
              {turbominingData.miningTxConfirmed ? (
                <button
                  disabled
                  className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium cursor-default"
                >
                  ✅ Confirmed {confirmationInfo?.confirmations ? `(${confirmationInfo.confirmations}+)` : ''}
                </button>
              ) : (
                <button
                  disabled
                  className="px-3 py-1.5 bg-slate-600 text-slate-300 rounded text-xs font-medium cursor-default"
                >
                  ⏳ Waiting confirmation
                </button>
              )}
              
              <MempoolButton txid={turbominingData.miningTxid} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
