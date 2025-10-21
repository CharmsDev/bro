import { MintingLoopController, MintingReadinessStatus } from './MintingLoop/index.js';

export function MintingLoopBox({ 
  turbominingData, 
  fundingAnalysis,
  walletAddress,
  miningReady,
  fundingReady,
  onComplete 
}) {
  return (
    <div className="box-section bg-slate-900/60 border border-slate-600 rounded-2xl p-6 mb-6">
      {/* Header with readiness status - responsive layout */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <h3 className="text-2xl font-bold text-purple-300">
          🔄 4. Automated Minting Loop
        </h3>
        
        <div className="lg:min-w-[400px]">
          <MintingReadinessStatus 
            miningReady={miningReady} 
            fundingReady={fundingReady} 
          />
        </div>
      </div>
      
      <div className="box-content">
        <MintingLoopController
          turbominingData={turbominingData}
          fundingAnalysis={fundingAnalysis}
          walletAddress={walletAddress}
          miningReady={miningReady}
          fundingReady={fundingReady}
          onComplete={onComplete}
        />
      </div>
    </div>
  );
}
