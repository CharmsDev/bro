import * as bitcoin from 'bitcoinjs-lib';

const network = bitcoin.networks.testnet;
const mempoolApi = 'https://mempool.space/testnet/api';

export interface UTXO {
  txid: string;
  vout: number;
  scriptPubKey: string; // hex format
  amount: number;        // satoshis
}

export function generateChallenge(seedTxid: string, vout: number): string {
  return `${seedTxid}:${vout}`;
}

function doubleSha256(buffer: Buffer): Buffer {
  return bitcoin.crypto.hash256(buffer);
}

export function minePoW(
  challenge: string,
  difficulty: number,
  showProgress: boolean = false
): { nonce: number; hash: string } {
  const ch = Buffer.from(challenge, 'utf8');
  let nonce = 0;
  const target = '0'.repeat(difficulty);
  while (true) {
    const input = Buffer.concat([ch, Buffer.from(nonce.toString(), 'utf8')]);
    const hash = doubleSha256(input).toString('hex');

    if (showProgress) {
      process.stdout.write(`\r   Nonce: ${nonce.toString().padStart(8)} | Hash: ${hash}`);
    }

    if (hash.startsWith(target)) {
      if (showProgress) {
        console.log('\n   ✓ Found valid hash!');
      }
      return { nonce, hash };
    }
    nonce++;
  }
}

export function createFundingTx(
  utxo: UTXO,
  userAddress: string,
  challenge: string,
  nonce: number,
  hash: string,
  fee: number
): string {
  const psbt = new bitcoin.Psbt({ network });
  psbt.addInput({
    hash: Buffer.from(utxo.txid, 'hex'),
    index: utxo.vout,
    witnessUtxo: {
      script: Buffer.from(utxo.scriptPubKey, 'hex'),
      value: utxo.amount,
    },
  });
  psbt.addOutput({
    script: bitcoin.payments.embed({
      data: [
        Buffer.from(challenge, 'utf8'),
        Buffer.from(nonce.toString(), 'utf8'),
        Buffer.from(hash, 'hex'),
      ],
    }).output!,
    value: 0,
  });
  psbt.addOutput({ address: userAddress, value: utxo.amount - fee });
  // User signs this PSBT in frontend wallet
  return psbt.toBase64();
}

export async function verifyProofTx(
  proofTxHex: string,
  difficulty: number
): Promise<boolean> {
  const tx = bitcoin.Transaction.fromHex(proofTxHex);
  const inp = tx.ins[0];
  const txid = Buffer.from(inp.hash).reverse().toString('hex');
  const vout = inp.index;

  // Extract OP_RETURN data
  const op = tx.outs.find(o => o.script[0] === bitcoin.opcodes.OP_RETURN)!;
  const chunks = bitcoin.script.decompile(op.script) as Buffer[];
  const [challengeBuf, nonceBuf, hashBuf] = chunks.slice(1) as Buffer[];
  const challenge = challengeBuf.toString('utf8');
  const nonce = nonceBuf.toString('utf8');
  const hash = hashBuf.toString('hex');

  // Input must match challenge seed UTXO
  const [seedTxid, seedVout] = challenge.split(':');
  if (seedTxid !== txid || Number(seedVout) !== vout) return false;

  // Verify proof of work
  const input = Buffer.concat([challengeBuf, nonceBuf]);
  if (doubleSha256(input).toString('hex') !== hash) return false;
  if (!hash.startsWith('0'.repeat(difficulty))) return false;

  // Check spendable UTXO is not spent
  const spendableIndex = tx.outs.findIndex(
    o => o.value > 0 && o.script.length > 0
  );
  const resp = await fetch(`${mempoolApi}/tx/${txid}/outspend/${spendableIndex}`);
  const json = await resp.json();
  return !json.spent;
}

export async function createMintTx(
  proofTxid: string,
  proofVout: number,
  tokenOutputs: Array<{ address: string; value: number }>
): Promise<string> {
  const hex = await fetch(`${mempoolApi}/tx/${proofTxid}/hex`).then(r => r.text());
  const tx = bitcoin.Transaction.fromHex(hex);
  const utxo = tx.outs[proofVout];

  const psbt = new bitcoin.Psbt({ network });
  psbt.addInput({ hash: proofTxid, index: proofVout, witnessUtxo: utxo });
  tokenOutputs.forEach(o => psbt.addOutput(o));
  // User signs and broadcasts this PSBT in frontend
  return psbt.toBase64();
}

// Demo function for console testing
export function demo(difficulty: number = 5): void {
  console.log('=== Bitcoin PoW Mining Demo ===\n');

  // Mock realistic UTXO for testing
  const mockUtxo: UTXO = {
    txid: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890'.substring(0, 64),
    vout: 0,
    scriptPubKey: '76a914' + '0'.repeat(40) + '88ac', // P2PKH script
    amount: 100000 // 0.001 BTC in satoshis
  };

  const userAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'; // Testnet bech32
  const fee = 1000; // 1000 sats fee

  console.log('1. Mock UTXO:');
  console.log(`   TXID: ${mockUtxo.txid}`);
  console.log(`   VOUT: ${mockUtxo.vout}`);
  console.log(`   Amount: ${mockUtxo.amount} sats\n`);

  // Generate challenge
  const challenge = generateChallenge(mockUtxo.txid, mockUtxo.vout);
  console.log('2. Challenge generated:');
  console.log(`   ${challenge}\n`);

  // Mine PoW
  console.log(`3. Mining PoW (difficulty: ${difficulty})...`);
  const startTime = Date.now();
  const { nonce, hash } = minePoW(challenge, difficulty, true);
  const miningTime = Date.now() - startTime;

  console.log(`\n   Final result:`);
  console.log(`   Nonce found: ${nonce}`);
  console.log(`   Hash: ${hash}`);
  console.log(`   Mining time: ${miningTime}ms\n`);

  // Create funding transaction
  console.log('4. Creating funding transaction...');
  const fundingTxPsbt = createFundingTx(mockUtxo, userAddress, challenge, nonce, hash, fee);
  console.log(`   PSBT (base64): ${fundingTxPsbt.substring(0, 50)}...\n`);

  console.log('5. Transaction ready for signing!');
  console.log('   - User can sign this PSBT with their wallet');
  console.log('   - After signing, use verifyProofTx() to validate');

  console.log('\n=== Demo Complete ===');
}

// Simple verification demo (without actual signed transaction)
export function verificationDemo(): void {
  console.log('=== Verification Demo ===\n');

  const challenge = 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678:0';
  const nonce = 175335;
  const difficulty = 4;

  console.log('1. Verifying PoW manually:');
  console.log(`   Challenge: ${challenge}`);
  console.log(`   Nonce: ${nonce}`);
  console.log(`   Difficulty: ${difficulty}\n`);

  // Manual PoW verification
  const input = Buffer.concat([
    Buffer.from(challenge, 'utf8'),
    Buffer.from(nonce.toString(), 'utf8')
  ]);
  const hash = doubleSha256(input).toString('hex');
  const isValid = hash.startsWith('0'.repeat(difficulty));

  console.log(`   Computed hash: ${hash}`);
  console.log(`   Valid PoW: ${isValid ? '✓' : '✗'}\n`);

  console.log('2. For full transaction verification:');
  console.log('   - Sign the PSBT with a wallet');
  console.log('   - Convert signed PSBT to hex transaction');
  console.log('   - Call verifyProofTx(txHex, difficulty)');

  console.log('\n=== Verification Demo Complete ===');
}

// Run demo if called directly
if (require.main === module) {
  demo();
  console.log('\n');
  verificationDemo();
}
