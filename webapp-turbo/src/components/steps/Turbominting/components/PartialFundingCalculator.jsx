import { useState, useEffect } from 'react';
import { MINTING_UTXO_VALUE } from '../../../../constants/minting.js';
import { AddressMonitor } from './AddressMonitor.jsx';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';

export function PartialFundingCalculator({ 
  availableSats,
  currentOutputs,
  totalOutputs,
  walletAddress,
  lastDeltaSats
}) {
  const [selectedOutputs, setSelectedOutputs] = useState(currentOutputs);
  const [showNotification, setShowNotification] = useState(false);
  const fundingBroadcasted = TurbomintingService.isFundingBroadcasted();
  
  useEffect(() => {
    if (currentOutputs > selectedOutputs) {
      setSelectedOutputs(currentOutputs);
    }
  }, [currentOutputs]);
  
  useEffect(() => {
    if (lastDeltaSats > 0) {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  }, [lastDeltaSats]);
  
  // Calculate values
  const minOutputs = currentOutputs;
  const maxOutputs = totalOutputs;
  const additionalOutputs = selectedOutputs - currentOutputs;
  // Required sats can NEVER be negative - if we have enough, it's 0
  const requiredSats = Math.max(0, additionalOutputs * MINTING_UTXO_VALUE);
  
  // Monitor when user requests more outputs than available
  const isMonitoring = requiredSats > 0;
  
  const handleSliderChange = (e) => {
    setSelectedOutputs(parseInt(e.target.value));
  };
  
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  const handleFundsDetected = (utxos, newFunds) => {
    window.location.reload();
  };
  
  // Calculate percentage for progress bar
  const percentage = ((selectedOutputs - minOutputs) / (maxOutputs - minOutputs)) * 100;
  
  return (
    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div className="flex-1">
          <h3 className="text-blue-300 text-base font-semibold mb-4">
            How many outputs do you want to mint?
          </h3>
          
          {/* New Funds Notification */}
          {showNotification && lastDeltaSats > 0 && (
            <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-3 mb-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">✅</span>
                <div>
                  <p className="text-emerald-400 text-sm font-semibold">
                    New funds received: +{lastDeltaSats.toLocaleString()} sats
                  </p>
                  <p className="text-slate-400 text-xs">
                    You can now mint {Math.floor(lastDeltaSats / MINTING_UTXO_VALUE)} more outputs!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col lg:flex-row items-stretch gap-3 mb-4">
            {/* Left: Output Selector - Compact */}
            <div className="flex items-center gap-2">
              {/* Decrease Button */}
              <button
                onClick={() => !fundingBroadcasted && selectedOutputs > minOutputs && setSelectedOutputs(selectedOutputs - 1)}
                disabled={fundingBroadcasted || selectedOutputs <= minOutputs}
                className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 disabled:opacity-50"
                title={fundingBroadcasted ? 'Locked - Funding transaction broadcasted' : 'Decrease the number of outputs to mint'}
              >
                <span className="text-white text-xl font-bold">−</span>
              </button>
              
              {/* Output Display - Compact */}
              <div className="bg-slate-800/50 border-2 border-blue-500/30 rounded-xl p-2 text-center min-w-[140px]">
                <div className="text-slate-400 text-xs mb-1">Outputs to mint</div>
                <div className="text-blue-400 text-2xl font-bold font-mono">{selectedOutputs}</div>
                <div className="text-slate-500 text-xs mt-1">
                  <span className="text-slate-400">Current: {currentOutputs}</span>
                  <span className="mx-1">•</span>
                  <span className="text-slate-400">Max: {maxOutputs}</span>
                </div>
              </div>
              
              {/* Increase Button */}
              <button
                onClick={() => !fundingBroadcasted && selectedOutputs < maxOutputs && setSelectedOutputs(selectedOutputs + 1)}
                disabled={fundingBroadcasted || selectedOutputs >= maxOutputs}
                className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 disabled:opacity-50"
                title={fundingBroadcasted ? 'Locked - Funding transaction broadcasted' : ''}
              >
                <span className="text-white text-xl font-bold">+</span>
              </button>
            </div>
            
            {/* Right: Funds Summary */}
            <div className="flex gap-3 lg:ml-auto">
              {/* Available Funds */}
              <div className="flex-1 lg:w-40 bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-3">
                <div className="text-emerald-400 text-xs mb-1">✓ Available</div>
                <div className="text-emerald-300 font-bold text-base">{availableSats.toLocaleString()}</div>
                <div className="text-emerald-500 text-xs">sats</div>
              </div>
              
              {/* Required Transfer */}
              <div className="flex-1 lg:w-40 bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                <div className="text-blue-400 text-xs mb-1 flex items-center gap-2">
                  <span>→ Need</span>
                  {isMonitoring && (
                    <div className="animate-spin h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                  )}
                </div>
                <div className="text-blue-300 font-bold text-base">{requiredSats.toLocaleString()}</div>
                <div className="text-blue-500 text-xs">
                  {isMonitoring ? <span className="animate-pulse">Waiting for funds...</span> : 'sats'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Address Display - Only show if funds are needed */}
          {requiredSats > 0 && (
            <>
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 mb-2">
                <p className="text-slate-300 text-xs mb-2">
                  To mint the number of outputs you want, please send <span className="text-blue-400 font-semibold">{requiredSats.toLocaleString()} sats</span> to your wallet address:
                </p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-blue-400 font-mono text-xs break-all">
                    {walletAddress}
                  </code>
                  <button 
                    className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold px-3 py-2 transition-all duration-200 shadow-sm text-white bg-blue-600 hover:bg-blue-700 text-xs flex-shrink-0"
                    onClick={handleCopyAddress}
                    title="Copy address"
                  >
                    <span>📋</span>
                  </button>
                </div>
              </div>
              
              {/* Auto-detection Note */}
              <p className="text-slate-500 text-xs">
                After sending, the system will automatically detect the new UTXOs.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Address Monitor - ONLY active when requiredSats > 0 AND not broadcasted */}
      {requiredSats > 0 && walletAddress && !fundingBroadcasted && (
        <AddressMonitor 
          address={walletAddress}
          onFundsDetected={handleFundsDetected}
        />
      )}
      
      {/* Locked Message */}
      {fundingBroadcasted && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mt-3">
          <p className="text-yellow-400 text-sm">
            🔒 Locked - Funding transaction has been broadcasted
          </p>
        </div>
      )}
    </div>
  );
}
