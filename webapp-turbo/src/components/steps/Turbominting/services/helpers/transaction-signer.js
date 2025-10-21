/**
 * Transaction Signer Helper
 * Signs Bitcoin transactions using Taproot
 */

import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';

/**
 * Sign a transaction with private key
 * 
 * @param {btc.Transaction} tx - Transaction to sign
 * @param {string|Uint8Array} privateKeyHex - Private key in hex format or Uint8Array
 * @param {number} inputCount - Number of inputs to sign
 * @returns {Object} - Signed transaction with txid and hex
 */
export function signTransaction(tx, privateKeyHex, inputCount) {
  // Handle different private key formats
  let privateKey;
  
  if (privateKeyHex instanceof Uint8Array) {
    // Already in correct format
    privateKey = privateKeyHex;
  } else if (typeof privateKeyHex === 'string' && privateKeyHex.includes(',')) {
    // Format: "80,7,6,142,..." -> Uint8Array
    const bytes = privateKeyHex.split(',').map(b => parseInt(b.trim()));
    privateKey = new Uint8Array(bytes);
  } else {
    // Format: "50076e8e..." -> Uint8Array
    privateKey = hex.decode(privateKeyHex);
  }
  
  // Sign all inputs
  for (let i = 0; i < inputCount; i++) {
    tx.signIdx(privateKey, i);
  }
  
  // Finalize transaction
  tx.finalize();
  
  // Get signed hex and txid
  const signedHex = hex.encode(tx.extract());
  const txid = tx.id;
  
  return {
    tx,
    signedHex,
    txid
  };
}

/**
 * Decode a transaction to JSON format
 * 
 * @param {btc.Transaction} tx - Transaction to decode
 * @returns {Object} - Decoded transaction in JSON format
 */
export function decodeTransaction(tx) {
  const decoded = {
    version: tx.version,
    locktime: tx.locktime,
    inputs: [],
    outputs: []
  };
  
  // Decode inputs
  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i);
    decoded.inputs.push({
      txid: input.txid ? hex.encode(input.txid) : '',
      vout: input.index || 0,
      sequence: input.sequence || 0xffffffff
    });
  }
  
  // Decode outputs
  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i);
    decoded.outputs.push({
      value: Number(output.amount || 0),
      scriptPubKey: output.script ? hex.encode(output.script) : ''
    });
  }
  
  return decoded;
}
