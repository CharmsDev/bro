import { useStore } from '../../store/index.js';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { environmentConfig } from '../../config/environment.js';
import TurbominingModule from '../../modules/turbomining/TurbominingModule.js';
import TurbomintingService from '../../services/turbominting/TurbomintingService.js';

export function PageLayout({ 
  children, 
  // Preferred: named step key
  currentKey,
  // Backward-compat numeric props (optional)
  currentStep, 
  totalSteps, 
  onNext, 
  onBack, 
  nextDisabled = false, 
  nextLabel = "Next", 
  backLabel = "Back",
  showNext = true,
  showBack = true
}) {
  const navigate = useNavigate();
  const { error, clearError, wallet, mining, batch, isWalletReady } = useStore();
  const [turbominingTxReady, setTurbominingTxReady] = useState(false);
  
  // Monitor turbomining transaction generation
  useEffect(() => {
    if (currentKey === 'turbomining') {
      const checkTurbominingTx = () => {
        const turbominingData = TurbominingModule.load();
        const hasSignedTx = turbominingData?.signedTxHex && turbominingData?.signedTxHex.length > 0;
        setTurbominingTxReady(hasSignedTx);
      };
      
      // Check immediately
      checkTurbominingTx();
      
      // Check every 500ms for updates
      const interval = setInterval(checkTurbominingTx, 500);
      return () => clearInterval(interval);
    }
  }, [currentKey]);
  
  // Canonical steps order and labels (decoupled from numbers)
  const steps = [
    { key: 'wallet', label: 'Wallet Setup' },
    { key: 'mining', label: 'Mining' },
    { key: 'turbomining', label: 'Turbomining' },
    { key: 'turbominting', label: 'Turbominting' },
  ];

  // Determine current index and totals
  const currentIndex = currentKey
    ? Math.max(0, steps.findIndex(s => s.key === currentKey))
    : (currentStep ? currentStep - 1 : 0);
  const total = totalSteps || steps.length;

  // Navigation rules: determine when back button should be disabled
  const getNavigationRules = () => {
    switch (currentKey) {
      case 'wallet':
        // Can go forward if wallet has UTXOs
        const hasUtxos = batch?.selectedUtxos?.length > 0 || batch?.utxos?.length > 0;
        return { canGoBack: true, canGoForward: hasUtxos };
      
      case 'mining':
        // Can go back to wallet, forward if mining completed
        return { 
          canGoBack: true, 
          canGoForward: mining.hasResult 
        };
      
      case 'turbomining':
        // Can go back to mining, forward if transaction is signed
        return { 
          canGoBack: true, 
          canGoForward: turbominingTxReady
        };
      
      case 'turbominting':
        // Can go back to turbomining, no forward (last step)
        return { canGoBack: true, canGoForward: false };
      
      default:
        return { canGoBack: true, canGoForward: true };
    }
  };

  const navigationRules = getNavigationRules();
  const shouldShowBack = showBack && navigationRules.canGoBack;
  const isNextDisabled = nextDisabled || !navigationRules.canGoForward;
  
  // Hide Next button on last step (turbominting)
  const shouldShowNext = showNext && currentKey !== 'turbominting';

  // Generate smart next button text based on current step
  const getNextButtonText = () => {
    if (nextLabel !== "Next") return nextLabel; // Use custom label if provided
    
    switch (currentKey) {
      case 'wallet':
        return 'Continue to Mining';
      case 'mining':
        return 'Continue to Turbomining';
      case 'turbomining':
        return 'Continue to Turbominting';
      case 'turbominting':
        return 'Complete Process';
      default:
        return 'Next';
    }
  };

  // Auto-navigation when no custom onNext is provided
  const handleAutoNext = () => {
    if (onNext) {
      onNext();
      return;
    }

    // Auto-navigate based on current step
    switch (currentKey) {
      case 'wallet':
        navigate('/mining');
        break;
      case 'mining':
        if (mining.hasResult) navigate('/turbomining');
        break;
      case 'turbomining':
        navigate('/turbominting');
        break;
      case 'minting':
        navigate('/');
        break;
      default:
        break;
    }
  };

  // Auto-navigation for back button
  const handleAutoBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    // Auto-navigate back based on current step
    switch (currentKey) {
      case 'batch':
        navigate('/wallet-setup');
        break;
      case 'mining':
        navigate('/wallet-setup');
        break;
      case 'turbomining':
        navigate('/mining');
        break;
      case 'turbominting':
        navigate('/turbomining');
        break;
      case 'minting':
        navigate('/turbomining');
        break;
      default:
        navigate('/');
        break;
    }
  };

  // Get network info for display
  const getNetworkInfo = () => {
    const network = environmentConfig.getNetwork();
    const isTestnet = environmentConfig.isTestnet();
    
    return {
      network: network,
      displayName: isTestnet ? 'Testnet4' : 'Mainnet',
      color: isTestnet ? 'text-yellow-400' : 'text-green-400',
      bgColor: isTestnet ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-green-900/20 border-green-600/50',
      icon: isTestnet ? '🧪' : '�'
    };
  };

  const networkInfo = getNetworkInfo();

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700 flex-shrink-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-200">BRO Token Minting</h1>
              <p className="text-slate-400 text-sm">Batch Bitcoin Token Minting Process</p>
            </div>
            
            {/* Wallet & Network Status */}
            <div className="flex items-center gap-4">
              {/* Debug localStorage Button */}
              <button
                onClick={() => navigate('/debug/localstorage')}
                className="flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 hover:bg-slate-700 transition-colors"
                title="View localStorage debug"
              >
                <span className="text-lg">�</span>
                <span className="text-slate-300 text-sm font-semibold">Debug</span>
              </button>

              {/* Bitcoin Network Indicator */}
              <div className={`flex items-center gap-2 ${networkInfo.bgColor} border rounded-xl px-3 py-2`}>
                <span className="text-lg">{networkInfo.icon}</span>
                <div className="text-left">
                  <div className={`text-sm font-semibold ${networkInfo.color}`}>Bitcoin {networkInfo.displayName}</div>
                  <div className="text-slate-400 text-xs">Network: {networkInfo.network}</div>
                </div>
              </div>

              {/* Wallet Status */}
              {isWalletReady() && (
                <button
                  onClick={() => navigate('/wallet-management')}
                  className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-600/50 rounded-xl px-4 py-2 hover:bg-emerald-900/30 transition-colors"
                  title="Click to manage wallet"
                >
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <div className="text-left">
                    <div className="text-emerald-300 text-sm font-semibold">Wallet Connected</div>
                    <div className="text-emerald-400 text-xs font-mono">
                      {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
                    </div>
                  </div>
                  <div className="text-emerald-400 text-lg">⚙</div>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-600 text-white px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span> {error}</span>
            <button 
              onClick={clearError}
              className="text-white hover:text-red-200 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto main-scroll">
        <div className="min-h-full px-6 py-8 flex items-center justify-center">
          <div className="w-full max-w-6xl">
            {children}
          </div>
        </div>
      </main>

      {/* Navigation Footer - Fixed */}
      <footer className="bg-slate-800/50 backdrop-blur-xl border-t border-slate-700 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Back Button - Left */}
            <div className="flex-1">
              {shouldShowBack && (
                <button
                  onClick={handleAutoBack}
                  className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-slate-300 bg-slate-700 hover:bg-slate-600"
                >
                  <span>←</span>
                  <span>{backLabel}</span>
                </button>
              )}
            </div>

            {/* Progress Dots - Center (compact) */}
            <div className="flex items-center gap-4">
              <div className="text-slate-400 text-sm">
                Step {currentIndex + 1} of {total}
              </div>
              <div className="flex gap-2">
                {steps.slice(0, total).map((s, i) => (
                  <div
                    key={s.key}
                    title={s.label}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i === currentIndex
                      ? 'bg-orange-500 shadow'
                      : i < currentIndex
                      ? 'bg-emerald-500'
                      : 'bg-slate-600'
                  }`}
                  />
                ))}
              </div>
            </div>

            {/* Continue Button or Mint More - Right */}
            <div className="flex-1 flex justify-end">
              {currentKey === 'turbominting' ? (
                <button
                  onClick={() => {
                    const success = TurbomintingService.resetForMintMore();
                    if (success) {
                      window.location.href = '/wallet-setup';
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:scale-105 hover:shadow-lg"
                >
                  <span>🔄</span>
                  <span>Mint More</span>
                </button>
              ) : shouldShowNext && (
                <button
                  onClick={handleAutoNext}
                  disabled={isNextDisabled}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white ${isNextDisabled ? 'bg-gray-600 opacity-60 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 hover:shadow-lg'}`}
                >
                  <span>{getNextButtonText()}</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
