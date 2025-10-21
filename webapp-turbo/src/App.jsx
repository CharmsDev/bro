import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Welcome } from './pages/Welcome.jsx';
import { WalletSetupPage } from './pages/WalletSetupPage.jsx';
import { BatchConfigurationPage } from './pages/BatchConfigurationPage.jsx';
import { MiningPage } from './pages/MiningPage.jsx';
import { TurbominingPage } from './pages/TurbominingPage.jsx';
import { TurbomintingPage } from './pages/TurbomintingPage.jsx';
import { WalletManagementPage } from './pages/WalletManagementPage.jsx';
import { CharmsWalletPage } from './pages/CharmsWalletPage.jsx';
import { LocalStorageDebugPage } from './pages/LocalStorageDebugPage.jsx';
import CentralStorage from './storage/CentralStorage.js';
import { HydrationManager } from './modules/index.js';
import { useStore } from './store/index.js';
import './App.css';

function App() {
  const store = useStore();
  
  useEffect(() => {
    CentralStorage.cleanupDuplicates();
    HydrationManager.hydrateAll(store);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/wallet-setup" element={<WalletSetupPage />} />
        <Route path="/batch-configuration" element={<BatchConfigurationPage />} />
        <Route path="/mining" element={<MiningPage />} />
        <Route path="/turbomining" element={<TurbominingPage />} />
        <Route path="/turbominting" element={<TurbomintingPage />} />
        <Route path="/wallet-management" element={<WalletManagementPage />} />
        <Route path="/charms-wallet" element={<CharmsWalletPage />} />
        <Route path="/debug/localstorage" element={<LocalStorageDebugPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
