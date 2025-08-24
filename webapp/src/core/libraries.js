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

    // Global library exposure for compatibility
    window.bitcoin = bitcoin;
    window.bip39 = bip39;
    window.ecc = ecc;
    window.bip32 = bip32;
    window.ECPair = ECPair;
    window.CryptoJS = CryptoJS;

}
