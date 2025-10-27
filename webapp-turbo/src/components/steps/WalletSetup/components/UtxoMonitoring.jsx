// UtxoMonitoring - Container for UTXO detection and mining transaction recovery
import React, { useState, useMemo, useEffect } from 'react';
import { useMiningTxScanner } from '../../../../hooks/useMiningTxScanner.js';
import { MiningTxAnalyzer } from '../../../../services/wallet/MiningTxAnalyzer.js';
import CentralStorage from '../../../../storage/CentralStorage.js';
import { environmentConfig } from '../../../../config/environment.js';
import { NewMiningMode } from './NewMiningMode.jsx';
import { RecoveryMode } from './RecoveryMode.jsx';
import { UtxoFound } from './UtxoFound.jsx';

export function UtxoMonitoring({ 
  wallet, 
  monitoringStatus, 
  savedUtxos = [],
  onCopyAddress,
  activeMode = 'new'
}) {
  const { isMonitoring, foundUtxo, message, pollingCount } = monitoringStatus;
  const [isLoadingRecovery, setIsLoadingRecovery] = useState(false);
  
  const displayUtxo = foundUtxo || (savedUtxos.length > 0 ? savedUtxos[0] : null);
  
  const analyzer = useMemo(() => new MiningTxAnalyzer(), []);
  
  const { miningTxs, isScanning, error: scanError, scanWallet, hasResults } = useMiningTxScanner(
    wallet?.address,
    false
  );
  
  useEffect(() => {
    if (activeMode === 'recover' && wallet?.address) {
      scanWallet();
    }
  }, [activeMode, wallet?.address]);
  
  const handleRecoverMiningTx = async (txid) => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 MINING TX RECOVERY - START');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 Transaction ID:', txid);
    console.log('👤 Wallet Address:', wallet.address);
    console.log('⏰ Recovery Time:', new Date().toISOString());
    
    setIsLoadingRecovery(true);
    
    try {
      console.log('\n🔍 Step 1: Analyzing mining transaction...');
      const recoveryData = await analyzer.getMiningTxForRecovery(txid, wallet.address);
      
      if (!recoveryData) {
        console.error('❌ Failed to load mining transaction data');
        alert('Failed to load mining transaction data');
        return;
      }
      
      console.log('✅ Step 1 Complete: Mining TX analyzed');
      console.log('📊 Recovery Data:', JSON.stringify(recoveryData, null, 2));
      
      const turbomintingData = {
        miningTxid: recoveryData.miningTxid,
        explorerUrl: environmentConfig.getExplorerUrl(recoveryData.miningTxid),
        miningTxConfirmed: recoveryData.miningTxConfirmed,
        miningReady: recoveryData.miningReady,
        confirmationInfo: recoveryData.confirmationInfo,
        timestamp: recoveryData.timestamp || Date.now()
      };
      
      console.log('\n💾 Step 2: Saving to localStorage...');
      console.log('📦 Turbomining Data:', JSON.stringify(recoveryData, null, 2));
      console.log('📦 Turbominting Data:', JSON.stringify(turbomintingData, null, 2));
      
      CentralStorage.saveTurbomining(recoveryData);
      CentralStorage.saveTurbominting(turbomintingData);
      
      console.log('✅ Step 2 Complete: Data saved to localStorage');
      
      console.log('\n🔧 Step 3: Enabling recovery mode...');
      CentralStorage.setMiningRecoveryMode(true);
      console.log('✅ Step 3 Complete: Recovery mode enabled');
      
      console.log('\n🔍 Step 4: Verifying saved data...');
      const savedTurbomining = CentralStorage.getTurbomining();
      const savedTurbominting = CentralStorage.getTurbominting();
      console.log('📦 Verified Turbomining:', JSON.stringify(savedTurbomining, null, 2));
      console.log('📦 Verified Turbominting:', JSON.stringify(savedTurbominting, null, 2));
      console.log('✅ Step 4 Complete: Data verified');
      
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ MINING TX RECOVERY - SUCCESS');
      console.log('🚀 Navigating to Turbominting...');
      console.log('═══════════════════════════════════════════════════════\n');
      
      window.location.href = '/turbominting';
    } catch (error) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.error('❌ MINING TX RECOVERY - FAILED');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.log('═══════════════════════════════════════════════════════\n');
      alert(`Failed to recover mining TX: ${error.message}`);
    } finally {
      setIsLoadingRecovery(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 backdrop-blur-md shadow-sm">
      {activeMode === 'new' ? (
        <>
          <h4 className="text-xl font-bold text-slate-200 flex items-center gap-2 mb-6">
            <span>🔍</span>
            <span>Looking for UTXO to start minting process</span>
          </h4>
          
          {displayUtxo ? (
            <UtxoFound 
              utxo={displayUtxo} 
              wallet={wallet}
              onCopyAddress={onCopyAddress}
            />
          ) : (
            <NewMiningMode
              wallet={wallet}
              isMonitoring={isMonitoring}
              message={message}
              pollingCount={pollingCount}
              onCopyAddress={onCopyAddress}
            />
          )}
        </>
      ) : (
        <>
          <h4 className="text-xl font-bold text-slate-200 flex items-center gap-2 mb-6">
            <span>🔄</span>
            <span>Recover Mining Transaction</span>
          </h4>
          
          <RecoveryMode
            wallet={wallet}
            miningTxs={miningTxs}
            isScanning={isScanning}
            scanError={scanError}
            hasResults={hasResults}
            isLoadingRecovery={isLoadingRecovery}
            onRecoverMiningTx={handleRecoverMiningTx}
            onCopyAddress={onCopyAddress}
          />
        </>
      )}
    </div>
  );
}
