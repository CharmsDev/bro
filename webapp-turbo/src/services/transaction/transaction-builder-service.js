// Bitcoin Transaction Builder - Clean version for Turbomining
import { environmentConfig } from '../../config/environment.js';
import { calculateRewardInfo } from '../mining/RewardCalculator.js';

class BitcoinTxBuilder {
    constructor() {
        this.network = environmentConfig.getNetwork();
    }

    stringToBuffer(str) {
        return new TextEncoder().encode(str);
    }

    // Create Turbomining transaction with multiple spendable outputs (unsigned)
    async createTurbominingTransaction(utxo, numberOfOutputs, miningResult, changeAddress, walletKeys) {
        try {
            
            const bitcoin = window.bitcoin;
            
            // Convert string network to bitcoinjs network object
            const networkObj = this.network.includes('testnet') ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
            const psbt = new bitcoin.Psbt({ network: networkObj });
            const fixedAmount = 333; // Sats per spendable output
            
            // Use xOnlyPubkey from wallet keys (already generated in Step 1)
            const xOnlyPubkey = Buffer.from(walletKeys.xOnlyPubkey, 'hex');
            
            
            // Add input
            
            // Create script from address if scriptPubKey is not available
            let scriptBuffer;
            if (utxo.scriptPubKey) {
                scriptBuffer = Buffer.from(utxo.scriptPubKey, 'hex');
            } else {
                // Generate P2TR script from UTXO address
                scriptBuffer = bitcoin.address.toOutputScript(utxo.address, networkObj);
            }
            
            // Debug UTXO data
            
            const amount = utxo.amount;
            if (!amount) {
                throw new Error('UTXO amount is undefined. Available fields: ' + Object.keys(utxo).join(', '));
            }
            
            // Add input with tapInternalKey (same as webapp original)
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: scriptBuffer,
                    value: amount,
                },
                tapInternalKey: xOnlyPubkey,
            });

            // Create OP_RETURN with nonce (same format as original webapp)
            const nonceBuffer = this.stringToBuffer(miningResult.nonce.toString());
            const baseUtxoId = `${utxo.txid}:${utxo.vout}`;
            
            // Output 0: OP_RETURN with mining data (0 sats)
            const opReturnScript = bitcoin.script.compile([
                bitcoin.opcodes.OP_RETURN,
                Buffer.from(nonceBuffer)
            ]);
            
            psbt.addOutput({
                script: opReturnScript,
                value: 0,
            });

            // Add multiple spendable outputs of 333 sats each
            for (let i = 0; i < numberOfOutputs; i++) {
                psbt.addOutput({
                    address: walletKeys.address,
                    value: fixedAmount,
                });
            }

            // Calculate fees dynamically using fee estimator
            const { getFeeEstimator } = await import('../bitcoin/fee-estimator.js');
            const feeEstimator = getFeeEstimator();
            
            // Estimate fee: 1 input + (1 OP_RETURN + N spendable outputs + 1 change)
            const numInputs = 1;
            const numOutputs = 1 + numberOfOutputs + 1; // OP_RETURN + spendable + change
            const totalFee = await feeEstimator.calculateFee(numInputs, numOutputs);
            
            
            const totalOutputValue = numberOfOutputs * fixedAmount;
            const changeAmount = utxo.amount - totalFee - totalOutputValue;

            // Add change output if there's remaining value
            if (changeAmount > 546) { // Dust limit
                psbt.addOutput({
                    address: walletKeys.address,
                    value: changeAmount,
                });
            }

            return {
                psbt, // Unsigned PSBT
                fee: totalFee,
                changeAmount: changeAmount > 546 ? changeAmount : 0,
                totalOutputs: numberOfOutputs,
                spendableOutputs: Array.from({ length: numberOfOutputs }, (_, i) => ({
                    outputIndex: i + 1,
                    value: fixedAmount,
                    hasOpReturn: true, // Transaction has OP_RETURN with mining data
                    utxoId: baseUtxoId // Base UTXO ID for contract validation
                })),
                totalCost: totalOutputValue + totalFee,
                miningData: {
                    nonce: miningResult.nonce,
                    hash: miningResult.hash,
                    baseUtxoId: baseUtxoId,
                    reward: (() => {
                        const rewardInfo = calculateRewardInfo(miningResult.nonce, miningResult.hash);
                        return Number(rewardInfo.rawAmount);
                    })()
                }
            };
                
        } catch (error) {
            throw new Error(`Turbomining transaction creation failed: ${error.message}`);
        }
    }
}

export { BitcoinTxBuilder };
