/**
 * WalletModule - Manages wallet state persistence and hydration
 */

import CentralStorage from '../../storage/CentralStorage.js';
import { WalletStorage } from '../../storage/index.js';

class WalletModule {
  static save(walletData) {
    try {
      CentralStorage.saveWallet({
        address: walletData.address,
        seedPhrase: walletData.seedPhrase,
        privateKey: walletData.privateKey,
        publicKey: walletData.publicKey,
        network: walletData.network,
        isGenerated: walletData.isGenerated || false,
        isImported: walletData.isImported || false,
        timestamp: Date.now()
      });
      
      if (walletData.extendedAddresses) {
        WalletStorage.saveExtendedAddresses(walletData.extendedAddresses);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static load() {
    try {
      const walletData = CentralStorage.getWallet();
      const extendedAddresses = WalletStorage.loadExtendedAddresses();
      
      if (!walletData) {
        return null;
      }
      
      return {
        ...walletData,
        extendedAddresses
      };
    } catch (error) {
      return null;
    }
  }
  
  static hydrate(store) {
    try {
      const walletData = this.load();
      
      if (walletData && store) {
        store.setWallet({
          address: walletData.address,
          seedPhrase: walletData.seedPhrase,
          privateKey: walletData.privateKey,
          publicKey: walletData.publicKey,
          network: walletData.network,
          isGenerated: walletData.isGenerated,
          isImported: walletData.isImported
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  static clear() {
    try {
      CentralStorage.clear('wallet');
      WalletStorage.clearAll();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static exists() {
    const walletData = CentralStorage.getWallet();
    return walletData !== null && walletData.address !== undefined;
  }
}

export default WalletModule;
