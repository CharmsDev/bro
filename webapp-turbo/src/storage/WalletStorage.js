/**
 * WalletStorage - Wallet-specific localStorage operations
 * Uses CentralStorage as the underlying storage mechanism
 */

import CentralStorage from './CentralStorage.js';

export class WalletStorage {
  /**
   * Save wallet data (address, seedPhrase, etc.)
   */
  static save(walletData) {
    CentralStorage.saveWallet(walletData);
  }

  /**
   * Load wallet data
   */
  static load() {
    return CentralStorage.getWallet();
  }

  /**
   * Save extended addresses (recipient and change addresses)
   */
  static saveExtendedAddresses(addresses) {
    CentralStorage.saveWalletExtendedAddresses(addresses);
    // Clean up legacy key if exists
    localStorage.removeItem('wallet_extended_addresses');
  }

  /**
   * Load extended addresses
   */
  static loadExtendedAddresses() {
    let addresses = CentralStorage.getWalletExtendedAddresses();
    
    // Migration: Check legacy key if not found in new location
    if (!addresses) {
      const legacyStored = localStorage.getItem('wallet_extended_addresses');
      if (legacyStored) {
        try {
          addresses = JSON.parse(legacyStored);
          // Migrate to new location
          CentralStorage.saveWalletExtendedAddresses(addresses);
          localStorage.removeItem('wallet_extended_addresses');
        } catch (error) {
        }
      }
    }
    
    return addresses;
  }

  /**
   * Get all addresses formatted for use
   */
  static getAllAddresses() {
    const extendedAddresses = this.loadExtendedAddresses();
    if (extendedAddresses) {
      return {
        recipient: extendedAddresses.recipient || [],
        change: extendedAddresses.change || [],
        total: (extendedAddresses.recipient?.length || 0) + (extendedAddresses.change?.length || 0)
      };
    }
    return { recipient: [], change: [], total: 0 };
  }

  /**
   * Check if wallet exists
   */
  static exists() {
    return CentralStorage.getWallet() !== null;
  }

  /**
   * Check if extended addresses exist
   */
  static hasExtendedAddresses() {
    const hasNew = CentralStorage.getWalletExtendedAddresses() !== null;
    const hasLegacy = localStorage.getItem('wallet_extended_addresses') !== null;
    return hasNew || hasLegacy;
  }

  /**
   * Clear all wallet data
   */
  static clear() {
    CentralStorage.clear('wallet');
    CentralStorage.clear('walletExtendedAddresses');
    // Clean up legacy keys
    localStorage.removeItem('wallet_extended_addresses');
    localStorage.removeItem('wallet_data');
  }

  /**
   * Get storage info
   */
  static getInfo() {
    const wallet = this.load();
    const addresses = this.getAllAddresses();
    
    return {
      hasWallet: wallet !== null,
      hasExtendedAddresses: this.hasExtendedAddresses(),
      address: wallet?.address || null,
      addressCount: addresses.total,
      timestamp: wallet?.timestamp || null
    };
  }
}
