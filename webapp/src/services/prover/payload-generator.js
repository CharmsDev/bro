/**
 * Payload Generator Module
 * Handles the core payload generation logic
 */

import { PROVER_CONFIG } from './config.js';
import BitcoinApiRouter from '../providers/bitcoin-api-router/index.js';
import { PayloadUtils } from './payload-utils.js';
import { TemplateLoader } from './template-loader.js';
import { PayloadValidator } from './payload-validator.js';


export class PayloadGenerator {
    constructor() {
        this.client = new BitcoinApiRouter();
        this.templateLoader = new TemplateLoader();
    }

    /**
     * Generate complete payload for prover API
     * This is the SINGLE consolidated function that handles everything:
     * - Template loading
     * - Payload generation with localStorage mining data
     * - Validation
     * - File saving
     * @param {Object} miningData - Mining data (for logging only)
     * @param {Object} proofData - Proof data
     * @param {Object} walletData - Wallet data
     * @returns {Promise<Object>} Generated payload
     */
    async generatePayload(miningData, proofData, walletData) {
        try {
            const template = await this.templateLoader.loadTemplate();
            const payload = await this._generatePayloadCore(miningData, proofData, walletData, template);
            PayloadValidator.validatePayload(payload);
            // Payload ready

            // 🚫 COMMENTED OUT: Payload download for debugging
            // await this._offerPayloadDownload(payload);

            return payload;
        } catch (error) {
            console.error('❌ Payload generation failed:', error);
            throw error;
        }
    }

    /**
     * Offer to download the generated payload as JSON file for debugging
     * Shows a save dialog to let user choose location and filename
     */
    async _offerPayloadDownload(payload) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const defaultFilename = `payload-${timestamp}.json`;
            const jsonString = JSON.stringify(payload, null, 2);

            // Use the File System Access API if available
            if ('showSaveFilePicker' in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: defaultFilename,
                        types: [{
                            description: 'JSON files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    const writable = await fileHandle.createWritable();
                    await writable.write(jsonString);
                    await writable.close();
                    return;
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return; // User cancelled the save dialog
                    }
                }
            }

            // Fallback to the traditional download method
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = defaultFilename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            // Silently fail on download error
        }
    }

    /**
     * Core payload generation logic (extracted from original generatePayload)
     * @private
     * @param {Object} miningData - Mining data (for logging only)
     * @param {Object} proofData - Proof data
     * @param {Object} walletData - Wallet data
     * @param {Object} template - Payload template
     * @returns {Promise<Object>} Generated payload
     */
    async _generatePayloadCore(miningData, proofData, walletData, template) {
        // Use real reward calculation from miningData
        let reward = (typeof miningData?.reward === 'number' && isFinite(miningData.reward)) ? miningData.reward : 0;

        // Fallback 1: AppState.miningReward (already uses calculateRewardInfo under the hood)
        if (!reward) {
            try {
                const appReward = window.appController?.appState?.miningReward;
                if (typeof appReward === 'number' && appReward > 0) {
                    reward = appReward;
                    // Using reward from AppState.miningReward
                }
            } catch (_) { /* ignore */ }
        }

        // Fallback 2: Use calculateRewardInfo with miningResult (prefer AppState, then localStorage)
        if (!reward && window.calculateRewardInfo) {
            try {
                const stateResult = window.appController?.appState?.miningResult || null;
                const miningResultStr = stateResult ? null : localStorage.getItem('miningResult');
                const miningResult = stateResult || (miningResultStr ? JSON.parse(miningResultStr) : null);
                if (miningResult?.bestNonce && miningResult?.bestHash) {
                    const info = window.calculateRewardInfo(miningResult.bestNonce, miningResult.bestHash);
                    reward = Number(info?.rawAmount) || 0;
                    // Calculated reward via calculateRewardInfo
                }
            } catch (_) { /* ignore */ }
        }

        // Fallback 3: Try BitcoinMiner.loadMiningResult() (mirrors AppState fallback)
        if (!reward && window.calculateRewardInfo && window.BitcoinMiner) {
            try {
                const miner = new window.BitcoinMiner();
                const result = miner.loadMiningResult();
                if (result?.bestNonce && result?.bestHash) {
                    const info = window.calculateRewardInfo(result.bestNonce, result.bestHash);
                    reward = Number(info?.rawAmount) || 0;
                    // Calculated reward via BitcoinMiner.loadMiningResult()
                }
            } catch (_) { /* ignore */ }
        }

        // Fallback 4: Try miningProgress if result not finalized yet
        if (!reward && window.calculateRewardInfo) {
            try {
                const progressStr = localStorage.getItem('miningProgress');
                const progress = progressStr ? JSON.parse(progressStr) : null;
                if (progress?.bestNonce && progress?.bestHash) {
                    const info = window.calculateRewardInfo(progress.bestNonce, progress.bestHash);
                    reward = Number(info?.rawAmount) || 0;
                    // Calculated reward via localStorage.miningProgress
                }
            } catch (_) { /* ignore */ }
        }

        // Reward calculation complete

        // Build a canonical mining object
        let mining = {
            txid: miningData?.txid,
            txHex: miningData?.txHex,
            reward: reward,
            changeAmount: miningData?.changeAmount
        };

        await this._fillMissingTxHex(mining);

        // Resolve wallet address
        const resolvedAddress = PayloadUtils.resolveWalletAddress(walletData);

        // Generate app_id and compute mined amount for $01 replacement
        const appId = await PayloadUtils.generateAppId(mining);
        const minedAmount = Number(reward) || 0;

        // DEBUG: Log hard-coded reward value
        console.log(`[PayloadGenerator] Hard-coded reward: ${reward}, minedAmount: ${minedAmount}`);

        // Mined amount calculated

        // Deep clone template to avoid mutations
        const payload = JSON.parse(JSON.stringify(template));

        // Update the payload with actual values
        this._updatePayloadWithMiningData(payload, mining, resolvedAddress, walletData, minedAmount);

        // Handle proof data
        this._updatePayloadWithProofData(payload, proofData, mining);

        // Handle optional fields
        await this._updateOptionalFields(payload, mining, miningData, template);

        return payload;
    }

    /**
     * Fill missing transaction hex from QuickNode API
     * @private
     */
    async _fillMissingTxHex(mining) {
        if (!mining.txHex && mining.txid) {
            try {
                mining.txHex = await this.quickNodeClient.getRawTransaction(mining.txid, false);
            } catch (e) {
                // Silently fail if the transaction hex cannot be fetched
            }
        }
    }

    /**
     * Update payload with mining data
     * @private
     */
    _updatePayloadWithMiningData(payload, mining, resolvedAddress, walletData, minedAmount) {
        // The `tx` field must contain the hex of the mining transaction
        payload.spell.private_inputs["$01"].tx = mining.txHex;

        // Use the mining transaction UTXO with vout 1 (the token output)
        payload.spell.ins[0].utxo_id = `${mining.txid}:1`;
        payload.spell.outs[0].address = resolvedAddress || walletData.address;

        payload.spell.outs[0].charms["$01"] = minedAmount;
        
        // DEBUG: Log final payload amount
        console.log(`[PayloadGenerator] Final payload $01 amount: ${payload.spell.outs[0].charms["$01"]}`);
        
        // Payload amount injection complete
    }

    /**
     * Update payload with proof data
     * @private
     */
    _updatePayloadWithProofData(payload, proofData, mining) {
        if (proofData && (proofData.proof || proofData.blockProof || proofData.txBlockProof || proofData.merkleProof)) {
            payload.spell.private_inputs["$01"].tx_block_proof = proofData.proof || proofData.blockProof || proofData.txBlockProof || proofData.merkleProof;
        }
    }

    /**
     * Update optional fields in payload
     * @private
     */
    async _updateOptionalFields(payload, mining, storedTx, template) {
        // The `prev_txs` field must contain the raw hex of the mining transaction.
        // This transaction is being proven and serves as a reference for the prover.
        let miningTxHex = null;
        try {
            miningTxHex = mining.txHex || await this.quickNodeClient.getRawTransaction(mining.txid, false);
        } catch (e) {
            // Silently fail if the transaction hex is unavailable
        }

        if (Array.isArray(payload.prev_txs)) {
            if (miningTxHex) {
                payload.prev_txs = [miningTxHex];
            } else {
                delete payload.prev_txs;
            }
        } else {
            delete payload.prev_txs;
        }

        // Funding/config fields
        const fundingVout = (storedTx && typeof storedTx.fundingVout === 'number') ? storedTx.fundingVout : 2;

        if ('funding_utxo' in template) {
            // Use the mining transaction ID with vout 2 for the funding/change output
            payload.funding_utxo = `${mining.txid}:2`;
        } else {
            delete payload.funding_utxo;
        }

        if ('funding_utxo_value' in template) {
            await this._setFundingUtxoValue(payload, mining, fundingVout);
        } else {
            delete payload.funding_utxo_value;
        }

        // Other optional config
        if ('change_address' in template) {
            const resolvedAddress = PayloadUtils.resolveWalletAddress({});
            payload.change_address = resolvedAddress;
        } else {
            delete payload.change_address;
        }

        if (!('fee_rate' in template)) delete payload.fee_rate;
        if (!('chain' in template)) delete payload.chain;
    }

    /**
     * Set funding UTXO value
     * @private
     */
    async _setFundingUtxoValue(payload, mining, fundingVout) {
        try {
            // Use the mining transaction to get the value from vout 2
            const miningTx = await this.quickNodeClient.getRawTransaction(mining.txid, true);
            const vout = miningTx.vout?.[2]; // Always use vout 2 for funding

            if (vout && typeof vout.value === 'number') {
                // Convert from Bitcoin decimal format to satoshis
                payload.funding_utxo_value = Math.round(vout.value * 100000000);
            }
        } catch (e) {
            // Silently fail if the transaction JSON cannot be fetched
        }

        // Fallback to `changeAmount` if the funding value could not be derived
        if (!(typeof payload.funding_utxo_value === 'number' && payload.funding_utxo_value > 0)) {
            if (typeof mining.changeAmount === 'number' && mining.changeAmount > 0) {
                // changeAmount from bitcoinjs-lib is already in satoshis, no conversion needed
                payload.funding_utxo_value = mining.changeAmount;
            } else {
                delete payload.funding_utxo_value;
            }
        }
    }
}
