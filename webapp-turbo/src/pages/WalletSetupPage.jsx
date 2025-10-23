import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import { useUtxoMonitor } from '../hooks/useUtxoMonitor.js';
import { WalletSetup } from '../components/steps/WalletSetup/index.jsx';
import { PageLayout } from '../components/layout/PageLayout.jsx';

export function WalletSetupPage() {
  const navigate = useNavigate();
  const wallet = useStore((state) => state.wallet);
  const batch = useStore((state) => state.batch);
  const { monitoringStatus } = useUtxoMonitor();

  // Check if we have a UTXO (either just found or already saved)
  const hasUtxo = !!monitoringStatus.foundUtxo || (batch?.selectedUtxos?.length > 0) || (batch?.utxos?.length > 0);

  const handleNext = () => {
    if (hasUtxo) {
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
      nextDisabled={!hasUtxo}
      nextLabel="Continue to Mining"
    >
      <WalletSetup />
    </PageLayout>
  );
}
