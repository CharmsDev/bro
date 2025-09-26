import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import * as ecc from '@bitcoinerlab/secp256k1';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';
import CryptoJS from 'crypto-js';

export function initializeLibraries() {
    bitcoin.initEccLib(ecc);
    const bip32 = BIP32Factory(ecc);
    const ECPair = ECPairFactory(ecc);

    // Global library exposure
    window.bitcoin = bitcoin;
    window.bitcoinjs = bitcoin;  // ✅ Alias
    window.bip39 = bip39;
    window.ecc = ecc;
    window.tinysecp256k1 = ecc;  // ✅ Alias
    
    // ✅ bip32 como instancia (para wallet-service.js) Y como objeto con factory (para signSpellTx.js)
    const bip32Instance = bip32;
    bip32Instance.BIP32Factory = BIP32Factory;  // Añadir factory como propiedad
    window.bip32 = bip32Instance;
    
    window.BIP32Factory = BIP32Factory;  // ✅ Factory también disponible directamente
    window.ECPair = ECPair;
    window.ECPairFactory = ECPairFactory;  // ✅ Factory también disponible
    window.CryptoJS = CryptoJS;

}
