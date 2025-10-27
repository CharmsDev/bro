import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import { useUtxoMonitor } from '../hooks/useUtxoMonitor.js';
import { WalletSetup } from '../components/steps/WalletSetup/index.jsx';
import { PageLayout } from '../components/layout/PageLayout.jsx';
import CentralStorage from '../storage/CentralStorage.js';

export function WalletSetupPage() {
  const navigate = useNavigate();
  const wallet = useStore((state) => state.wallet);
  const batch = useStore((state) => state.batch);
  const { monitoringStatus } = useUtxoMonitor();
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Check recovery mode on mount and when it changes
  useEffect(() => {
    const checkRecoveryMode = () => {
      const recoveryMode = CentralStorage.isMiningRecoveryMode();
      setIsRecoveryMode(recoveryMode);
    };
    
    checkRecoveryMode();
    
    // Check periodically in case it changes
    const interval = setInterval(checkRecoveryMode, 500);
    return () => clearInterval(interval);
  }, []);

  // Check if we have a UTXO (either just found or already saved)
  const hasUtxo = !!monitoringStatus.foundUtxo || (batch?.selectedUtxos?.length > 0) || (batch?.utxos?.length > 0);

  // Disable button if in recovery mode OR no UTXO
  const isNextDisabled = isRecoveryMode || !hasUtxo;

  const handleNext = () => {
    if (hasUtxo && !isRecoveryMode) {
      navigate('/mining');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <PageLayout 
      currentKey="wallet" 
      stepName="Wallet Setup"
      onNext={handleNext}
      nextDisabled={isNextDisabled}
      nextLabel="Continue to Mining"
    >
      <WalletSetup />
    </PageLayout>
  );
}
