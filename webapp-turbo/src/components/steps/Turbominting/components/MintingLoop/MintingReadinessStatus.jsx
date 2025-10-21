/**
 * Minting Readiness Status
 * Displays two separate badges for mining and funding readiness
 * Responsive: horizontal on desktop, vertical on mobile
 */

export function MintingReadinessStatus({ miningReady, fundingReady }) {
  const allReady = miningReady && fundingReady;

  return (
    <div className="flex flex-col gap-2">
      {/* Two badges side by side on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Mining Ready Badge */}
        <div className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${
          miningReady 
            ? 'bg-green-900/30 border-green-600/50 text-green-400' 
            : 'bg-slate-800/50 border-slate-600/50 text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {miningReady ? '✅' : '⏳'}
            </span>
            <div className="font-medium text-xs">
              Mining {miningReady ? 'Ready' : 'Pending'}
            </div>
          </div>
        </div>

        {/* Funding Ready Badge */}
        <div className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${
          fundingReady 
            ? 'bg-green-900/30 border-green-600/50 text-green-400' 
            : 'bg-slate-800/50 border-slate-600/50 text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {fundingReady ? '✅' : '⏳'}
            </span>
            <div className="font-medium text-xs">
              Funding {fundingReady ? 'Ready' : 'Pending'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
