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
            
            // First, estimate fee WITHOUT change output
            const numInputs = 1;
            const numOutputsWithoutChange = 1 + numberOfOutputs; // OP_RETURN + spendable outputs
            const feeWithoutChange = await feeEstimator.calculateFee(numInputs, numOutputsWithoutChange);
            
            const totalOutputValue = numberOfOutputs * fixedAmount;
            let changeAmountWithoutChange = utxo.amount - feeWithoutChange - totalOutputValue;
            
            // If change is above dust limit, recalculate fee WITH change output
            let totalFee = feeWithoutChange;
            let changeAmount = changeAmountWithoutChange;
            
            if (changeAmountWithoutChange > 546) {
                // Recalculate with change output included
                const numOutputsWithChange = numOutputsWithoutChange + 1;
                const feeWithChange = await feeEstimator.calculateFee(numInputs, numOutputsWithChange);
                totalFee = feeWithChange;
                changeAmount = utxo.amount - feeWithChange - totalOutputValue;
                
                // Add change output
                psbt.addOutput({
                    address: walletKeys.address,
                    value: changeAmount,
                });
            }

            return {
                psbt,
                fee: totalFee,
                changeAmount: changeAmount > 546 ? changeAmount : 0,
                totalOutputs: numberOfOutputs,
                spendableOutputs: Array.from({ length: numberOfOutputs }, (_, i) => ({
                    outputIndex: i + 1,
                    value: fixedAmount,
                    hasOpReturn: true,
                    utxoId: null
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
