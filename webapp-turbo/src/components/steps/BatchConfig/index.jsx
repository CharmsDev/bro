// BatchConfig - Batch size selection and UTXO monitoring
import { useState, useEffect } from 'react';
import { useBatchConfig } from '../../../hooks/useBatchConfig.js';
import { useStore } from '../../../store/index.js';
import { FUNDING_STATUS } from '../../../constants/batch.js';
import { StepContainer } from '../../common/StepContainer.jsx';

export function BatchConfig() {
  const { wallet, goToNextStep } = useStore();
  const { 
    batch, 
    batchSizes, 
    fundingStatus,
    isReady,
    maxPossibleMints,
    fundingShortfall,
    recommendedBatchSize,
    updateBatchSize,
    startUtxoMonitoring,
    stopUtxoMonitoring,
    refreshUtxos
  } = useBatchConfig();

  const [customQuantity, setCustomQuantity] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');

  // Check if step is locked (mining tx already broadcast)
  useEffect(() => {
    const checkLockStatus = async () => {
      const { default: TurbominingModule } = await import('../../../modules/turbomining/TurbominingModule.js');
      const savedData = TurbominingModule.load();
      
      if (savedData?.step1Locked === true) {
        setIsLocked(true);
        setLockReason('Mining transaction already broadcast. UTXO selection is locked.');
      }
    };
    
    checkLockStatus();
  }, []);

  // Auto-start monitoring when component mounts if wallet is ready AND not locked
  useEffect(() => {
    if (!isLocked && wallet?.address && !batch.isMonitoring && batch.utxos.length === 0) {
      handleStartMonitoring();
    }
  }, [wallet?.address, isLocked]);

  const handleBatchSizeSelect = (size) => {
    updateBatchSize(size);
    setShowCustomInput(false);
    setCustomQuantity('');
  };

  const handleCustomQuantitySubmit = () => {
    if (customQuantity && updateBatchSize(customQuantity)) {
      setShowCustomInput(false);
      setCustomQuantity('');
    }
  };

  const handleStartMonitoring = () => {
    if (isLocked) {
      return;
    }
    if (wallet?.address) {
      startUtxoMonitoring(wallet.address);
    }
  };

  const handleStopMonitoring = () => {
    if (isLocked) {
      return;
    }
    stopUtxoMonitoring();
  };

  const handleRefreshUtxos = () => {
    if (isLocked) {
      return;
    }
    if (wallet?.address) {
      refreshUtxos(wallet.address);
    }
  };

  const handleProceedToMining = () => {
    if (isReady) {
      goToNextStep();
    }
  };

  const formatSats = (sats) => {
    return new Intl.NumberFormat().format(sats);
  };

  return (
    <StepContainer
      title="Step 2: Batch Configuration"
      subtitle="Configure your minting batch size and monitor UTXOs for sufficient funding."
    >
      {/* Lock Warning */}
      {isLocked && (
        <div className="max-w-5xl mx-auto mb-6 p-6 bg-yellow-900/20 border-2 border-yellow-600/70 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔒</span>
            <div>
              <div className="text-yellow-300 font-semibold text-lg">Step Locked</div>
              <div className="text-yellow-200/80 text-sm mt-1">{lockReason}</div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto mt-12 p-8 bg-gradient-to-br from-bro-slate to-bro-dark border border-slate-600 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:border-bro-blue hover:shadow-glow-blue">
        
        {/* Batch Size Selection */}
        <div className="mb-8">
          <h4 className="text-2xl font-bold text-slate-200 mb-3 flex items-center gap-2">
            <span></span>
            <span>Select Batch Size</span>
          </h4>
          <p className="text-slate-400 mb-6">Choose how many BRO tokens you want to mint in this batch.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {batchSizes.map((size) => (
              <button
                key={size}
                className={`
                  p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105
                  ${batch.quantity === size 
                    ? 'bg-bro-blue/20 border-bro-blue shadow-glow-blue text-blue-300' 
                    : 'bg-bro-dark/80 border-slate-600 hover:border-slate-500 text-slate-300 hover:bg-slate-700/50'
                  }
                  ${(batch.isMonitoring || isLocked) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => handleBatchSizeSelect(size)}
                disabled={batch.isMonitoring || isLocked}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">{size}</div>
                  <div className="text-sm opacity-75">{formatSats(size * 900)} sats</div>
                </div>
              </button>
            ))}
            
            <button
              className={`
                p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105
                ${showCustomInput 
                  ? 'bg-bro-orange/20 border-bro-orange shadow-glow-orange text-orange-300' 
                  : 'bg-bro-dark/80 border-slate-600 hover:border-slate-500 text-slate-300 hover:bg-slate-700/50'
                }
                ${batch.isMonitoring ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={() => setShowCustomInput(!showCustomInput)}
              disabled={batch.isMonitoring}
            >
              <div className="text-center">
                <div className="text-xl font-bold mb-1">Custom</div>
                <div className="text-sm opacity-75">Your choice</div>
              </div>
            </button>
          </div>

          {showCustomInput && (
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-600 backdrop-blur-sm">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Custom Quantity
                  </label>
                  <input
                    type="number"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(e.target.value)}
                    placeholder="Enter quantity (1-256)"
                    min="1"
                    max="256"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:border-bro-blue focus:ring-1 focus:ring-bro-blue transition-colors"
                  />
                </div>
                <button
                  className={`
                    px-6 py-3 rounded-lg font-semibold transition-all duration-300
                    ${customQuantity 
                      ? 'bg-gradient-to-r from-bro-orange to-orange-600 text-white hover:scale-105 shadow-lg' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }
                  `}
                  onClick={handleCustomQuantitySubmit}
                  disabled={!customQuantity}
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Selection Summary */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-600 mb-8">
          <h5 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span></span>
            <span>Batch Summary</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Selected Quantity:</div>
              <div className="text-xl font-bold text-blue-300">{batch.quantity} mints</div>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Required Funds:</div>
              <div className="text-xl font-bold text-amber-400">{formatSats(batch.requiredFunds)} sats</div>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Available Funds:</div>
              <div className={`text-xl font-bold ${batch.availableFunds >= batch.requiredFunds ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatSats(batch.availableFunds)} sats
              </div>
            </div>
          </div>
        </div>

        {/* UTXO Monitoring Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
              <span></span>
              <span>UTXO Monitoring</span>
            </h4>
            <div className="flex gap-3">
              {!batch.isMonitoring ? (
                <button
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all duration-300
                    ${wallet?.address 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:scale-105' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }
                  `}
                  onClick={handleStartMonitoring}
                  disabled={!wallet?.address}
                >
                  <span className="flex items-center gap-2">
                    <span></span>
                    <span>Start Monitoring</span>
                  </span>
                </button>
              ) : (
                <button
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:scale-105"
                  onClick={handleStopMonitoring}
                >
                  <span className="flex items-center gap-2">
                    <span>⏹</span>
                    <span>Stop Monitoring</span>
                  </span>
                </button>
              )}
              
              <button
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all duration-300
                  ${!batch.isMonitoring && wallet?.address 
                    ? 'bg-slate-600 hover:bg-slate-700 text-white shadow-lg hover:scale-105' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }
                `}
                onClick={handleRefreshUtxos}
                disabled={batch.isMonitoring || !wallet?.address}
              >
                <span className="flex items-center gap-2">
                  <span>�</span>
                  <span>Refresh</span>
                </span>
              </button>
            </div>
          </div>

          {/* Funding Status */}
          <div className="mb-6">
            {batch.fundingStatus === FUNDING_STATUS.MONITORING && (
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-300 font-semibold text-lg">Monitoring blockchain for UTXOs...</span>
                </div>
                <p className="text-slate-400">Scanning for incoming transactions to your wallet address.</p>
              </div>
            )}
            
            {batch.fundingStatus === FUNDING_STATUS.INSUFFICIENT && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6">
                <div className="text-center mb-4">
                  <span className="text-red-400 font-semibold text-lg flex items-center justify-center gap-2">
                    <span></span>
                    <span>Insufficient funds</span>
                  </span>
                  <p className="text-slate-300 mt-2">Need <strong className="text-red-300">{formatSats(fundingShortfall)} more sats</strong></p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="text-sm text-slate-400 mb-2">Send funds to:</div>
                  <code className="text-slate-200 font-mono text-sm break-all bg-slate-900/50 p-2 rounded block">
                    {wallet?.address}
                  </code>
                </div>
              </div>
            )}
            
            {batch.fundingStatus === FUNDING_STATUS.SUFFICIENT && (
              <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-xl p-6 text-center">
                <span className="text-emerald-400 font-semibold text-lg flex items-center justify-center gap-2">
                  <span></span>
                  <span>Sufficient funds available</span>
                </span>
                <p className="text-slate-300 mt-2">Ready to proceed with <strong className="text-emerald-300">{batch.quantity} mints</strong></p>
              </div>
            )}
            
            {batch.fundingStatus === FUNDING_STATUS.ERROR && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-center">
                <span className="text-red-400 font-semibold text-lg flex items-center justify-center gap-2">
                  <span></span>
                  <span>Error monitoring UTXOs</span>
                </span>
                <p className="text-slate-300 mt-2">Please try refreshing or check your connection</p>
              </div>
            )}
          </div>

          {/* UTXOs List */}
          {batch.utxos.length > 0 && (
            <div className="mb-6">
              <h5 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <span></span>
                <span>Available UTXOs ({batch.utxos.length})</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batch.utxos.map((utxo, index) => (
                  <div key={`${utxo.txid}:${utxo.vout}`} className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-slate-400 mb-1">UTXO ID:</div>
                    <div className="font-mono text-xs text-slate-300 mb-2">
                      {utxo.txid.substring(0, 8)}...:{utxo.vout}
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-slate-400">Value:</div>
                        <div className="font-semibold text-emerald-400">{formatSats(utxo.value)} sats</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">Confirmations:</div>
                        <div className="font-semibold text-blue-400">{utxo.confirmations || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {maxPossibleMints > 0 && maxPossibleMints !== batch.quantity && (
            <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-6 mb-6">
              <h5 className="text-amber-400 font-semibold text-lg mb-3 flex items-center gap-2">
                <span>�</span>
                <span>Recommendations</span>
              </h5>
              <p className="text-slate-300">
                With your current funds, you could mint up to <strong className="text-amber-300">{maxPossibleMints}</strong> tokens.
                {recommendedBatchSize !== batch.quantity && (
                  <>
                    {' '}Consider selecting <strong className="text-amber-300">{recommendedBatchSize}</strong> for optimal efficiency.
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="text-center mt-8">
          <button
            className={`
              px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 transform
              ${isReady
                ? 'bg-gradient-to-r from-bro-orange to-orange-600 text-white hover:scale-105 shadow-glow-orange'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
              }
            `}
            onClick={handleProceedToMining}
            disabled={!isReady}
          >
            <div className="flex items-center gap-2">
              <span>{isReady ? '⚡' : ''}</span>
              <span>{isReady ? 'Proceed to Mining' : 'Waiting for Sufficient Funds'}</span>
            </div>
          </button>
        </div>
      </div>
    </StepContainer>
  );
}
