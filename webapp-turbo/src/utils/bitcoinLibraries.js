// Bitcoin libraries initialization for browser - Replicated from webapp original
import BitcoinApiRouter from '../services/providers/bitcoin-api-router/bitcoin-api-router.js';

export async function initializeBitcoinLibraries() {
  try {
    // Import all required Bitcoin libraries
    const [
      bitcoin,
      bip39,
      ecc,
      bip32Module,
      ecpairModule,
      cryptoJS
    ] = await Promise.all([
      import('bitcoinjs-lib'),
      import('bip39'),
      import('@bitcoinerlab/secp256k1'),
      import('bip32'),
      import('ecpair'),
      import('crypto-js')
    ]);

    // Initialize bitcoinjs-lib with ECC library (exact replica)
    bitcoin.initEccLib(ecc.default);
    const bip32 = bip32Module.BIP32Factory(ecc.default);
    const ECPair = ecpairModule.ECPairFactory(ecc.default);

    // Global library exposure (exact replica from webapp)
    window.bitcoin = bitcoin;
    window.bitcoinjs = bitcoin;  //  Alias
    window.bip39 = bip39;
    window.ecc = ecc.default;
    window.tinysecp256k1 = ecc.default;  //  Alias
    
    //  bip32 as instance (for wallet-service.js) AND as object with factory (for signSpellTx.js)
    const bip32Instance = bip32;
    bip32Instance.BIP32Factory = bip32Module.BIP32Factory;  // Add factory as property
    window.bip32 = bip32Instance;
    
    window.BIP32Factory = bip32Module.BIP32Factory;  //  Factory also available directly
    window.ECPair = ECPair;
    window.ECPairFactory = ecpairModule.ECPairFactory;  //  Factory also available
    window.CryptoJS = cryptoJS.default;

    //  Register BitcoinAPIService globally using the correct router
    window.BitcoinAPIService = BitcoinApiRouter;

    
    return {
      bitcoin,
      bip39,
      bip32,
      ECPair,
      ecc: ecc.default
    };
    
  } catch (error) {
    throw error;
  }
}
