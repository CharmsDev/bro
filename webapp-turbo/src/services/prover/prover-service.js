// Prover API Service
import { environmentConfig } from '../../config/environment.js';

export class ProverService {
    constructor() {
        this.proverUrl = environmentConfig.getProverApiUrl();
    }

    // Call prover API with payload
    async callProver(payload) {
        try {

            const response = await fetch(this.proverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Prover API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            // Prover returns array: ["commit_tx_hex", "spell_tx_hex"]
            return result;

        } catch (error) {
            throw new Error(`Prover API failed: ${error.message}`);
        }
    }

    // Compose payload for a single output
    composePayload(spendableOutput, fundingUtxo, miningData, miningTxid) {
        const payload = {
            mining_txid: miningTxid,
            mining_nonce: miningData.nonce,
            mining_hash: miningData.hash,
            spendable_output: {
                txid: miningTxid,
                vout: spendableOutput.outputIndex,
                value: spendableOutput.value
            },
            funding_utxo: {
                txid: fundingUtxo.txid,
                vout: fundingUtxo.vout,
                value: fundingUtxo.value || fundingUtxo.amount,
                address: fundingUtxo.address
            }
        };

        return payload;
    }
}
