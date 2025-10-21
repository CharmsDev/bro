import { MINTING_UTXO_VALUE } from '../../../../constants/minting.js';
import { PartialFundingCalculator } from './PartialFundingCalculator.jsx';

export function FundingAnalysisBox({ turbominingData, walletAddress, fundingAnalysisData }) {
  const funding = fundingAnalysisData;
  const targetOutputs = turbominingData?.numberOfOutputs || 0;
  const currentOutputs = funding.currentOutputs || 0;
  const requiredSats = targetOutputs * MINTING_UTXO_VALUE;
  const hasEnough = funding.availableSats >= requiredSats;
  const missingAmount = requiredSats - funding.availableSats;
  const needsMonitoring = missingAmount > 0;


  return (
    <div className="box-section bg-slate-900/60 border border-slate-600 rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-2xl font-bold text-purple-300">
          💰 2. Funding Transaction Analysis
        </h3>
        
        {/* Status indicator - ONLY for wallet scan, NOT for address monitoring */}
        {funding.isScanning ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-purple-400 text-sm font-medium">Scanning...</span>
          </div>
        ) : funding.analysis ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-emerald-400 text-xs font-medium">Analysis complete</span>
          </div>
        ) : null}
      </div>

      {/* Waiting for analysis message */}
      {targetOutputs > 0 && !turbominingData?.fundingTxid && !funding.analysis && (
        <div className="bg-slate-800/30 rounded-xl p-6 mb-4 border border-slate-700/50 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
            <span className="text-slate-400">Waiting for funding analysis...</span>
          </div>
          <p className="text-slate-500 text-sm">
            Analysis will start automatically when mining transaction is confirmed
          </p>
        </div>
      )}

      {/* Minting Cost Calculation - Show if analysis is complete OR if funding was already broadcasted */}
      {targetOutputs > 0 && funding.analysis && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-4 mb-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📊</span>
            <h4 className="text-slate-200 font-semibold">Minting Requirements</h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* Outputs */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-1">Outputs</div>
              <div className="text-slate-100 text-lg font-bold font-mono">{targetOutputs}</div>
            </div>
            
            {/* Cost per output */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-1">Per Output</div>
              <div className="text-slate-100 text-lg font-bold font-mono">{MINTING_UTXO_VALUE.toLocaleString()}</div>
              <div className="text-slate-500 text-xs">sats</div>
            </div>
            
            {/* Total required */}
            <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-600/30">
              <div className="text-purple-400 text-xs mb-1">Total Required</div>
              <div className="text-purple-300 text-lg font-bold font-mono">{requiredSats.toLocaleString()}</div>
              <div className="text-purple-500 text-xs">sats</div>
            </div>
            
            {/* Available */}
            <div className={`rounded-lg p-3 border ${
              hasEnough 
                ? 'bg-emerald-900/20 border-emerald-600/30' 
                : 'bg-red-900/20 border-red-600/30'
            }`}>
              <div className={`text-xs mb-1 ${hasEnough ? 'text-emerald-400' : 'text-red-400'}`}>
                Available
              </div>
              <div className={`text-lg font-bold font-mono ${hasEnough ? 'text-emerald-300' : 'text-red-300'}`}>
                {funding.availableSats.toLocaleString()}
              </div>
              <div className={`text-xs ${hasEnough ? 'text-emerald-500' : 'text-red-500'}`}>
                sats
              </div>
            </div>
          </div>
          
          {/* Status message - 3 casos basados en FONDOS, no en escaneo */}
          {!hasEnough ? (
            // CASO 2 y 3: Fondos insuficientes - mostrar calculator
            <>
              {funding.availableSats > 0 && funding.currentOutputs > 0 ? (
                // CASO 3: Fondos parciales - podemos mintear algunos outputs
                <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3 flex items-start gap-2 mb-3">
                  <span className="text-amber-400 text-lg">⚠️</span>
                  <div className="flex-1">
                    <p className="text-amber-400 text-sm font-semibold mb-1">
                      Partial funding: Can mint {funding.currentOutputs} of {targetOutputs} outputs
                    </p>
                    <p className="text-slate-400 text-xs">
                      Need {(requiredSats - funding.availableSats).toLocaleString()} more sats for all outputs
                    </p>
                  </div>
                </div>
              ) : (
                // CASO 2: Sin fondos - no se puede mintear nada
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 flex items-start gap-2 mb-3">
                  <span className="text-red-400 text-lg">❌</span>
                  <div className="flex-1">
                    <p className="text-red-400 text-sm font-semibold mb-1">
                      Insufficient funds - cannot mint any outputs
                    </p>
                    <p className="text-slate-400 text-xs">
                      Need {requiredSats.toLocaleString()} sats to start minting
                    </p>
                  </div>
                </div>
              )}
              
              {/* Interactive Funding Calculator - SIEMPRE visible si no hay fondos suficientes */}
              {walletAddress && (
                <PartialFundingCalculator 
                  availableSats={funding.availableSats}
                  currentOutputs={funding.currentOutputs}
                  totalOutputs={targetOutputs}
                  walletAddress={walletAddress}
                  lastDeltaSats={funding.lastDeltaSats}
                />
              )}
            </>
          ) : (
            // CASO 1: Fondos suficientes
            <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-3 flex items-center gap-2">
              <span className="text-emerald-400 text-lg">✅</span>
              <p className="text-emerald-400 text-sm font-semibold">
                Sufficient funds for all {targetOutputs} outputs
              </p>
            </div>
          )}
        </div>
      )}

        {funding.isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-3 text-slate-400">Analyzing wallet UTXOs...</span>
          </div>
        ) : funding.error ? (
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
            <p className="text-red-400 font-semibold mb-2">❌ Analysis failed</p>
            <p className="text-slate-400 text-sm mb-3">{funding.error}</p>
            <div className="flex gap-2">
              <button
                onClick={funding.analyzeFunding}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

    </div>
  );
}
