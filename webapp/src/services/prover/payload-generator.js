/**
 * Payload Generator Module
 * Handles the core payload generation logic
 */

import { PROVER_CONFIG } from './config.js';
import { MempoolClient } from './mempool-client.js';
import { PayloadUtils } from './payload-utils.js';
import { TemplateLoader } from './template-loader.js';
import { PayloadValidator } from './payload-validator.js';


export class PayloadGenerator {
    constructor() {
        this.mempoolClient = new MempoolClient();
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
            console.log('✅ Payload generated');
            
            // Add payload download functionality for debugging
            this._offerPayloadDownload(payload);
            
            return payload;
        } catch (error) {
            console.error('❌ Payload generation failed:', error);
            throw error;
        }
    }

    /**
     * Offer to download the generated payload as JSON file for debugging
     */
    _offerPayloadDownload(payload) {
        try {
            // Create timestamp for filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `payload-${timestamp}.json`;
            
            // Create download link
            const jsonString = JSON.stringify(payload, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create temporary download link
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            // Add to DOM, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up URL
            URL.revokeObjectURL(url);
            
            console.log(`📥 Payload downloaded as: ${filename}`);
            
        } catch (error) {
            console.warn('Failed to download payload:', error);
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
        console.log('🚀 Generating payload...');

        // SINGLE SOURCE OF TRUTH: Refresh mining transaction data from localStorage
        const storedTx = PayloadUtils.loadMiningDataFromStorage();

        // Build canonical mining object EXCLUSIVELY from localStorage values
        let mining = {
            txid: storedTx?.txid,                    // ← MINING transaction ID (CORRECT)
            txHex: storedTx?.txHex,                  // ← MINING transaction hex
            difficulty: (typeof storedTx?.difficulty === 'number') ? storedTx.difficulty : undefined,
            reward: (typeof storedTx?.reward === 'number') ? storedTx.reward : undefined,
            changeAmount: (typeof storedTx?.changeAmount === 'number') ? storedTx.changeAmount : undefined
        };



        await this._fillMissingTxHex(mining);

        // Log debugging info
        PayloadUtils.logLocalStorageDebug();
        console.log('👛 walletData snapshot:', walletData);

        // Resolve wallet address
        const resolvedAddress = PayloadUtils.resolveWalletAddress(walletData);

        // Generate app_id and calculate mined amount
        const appId = await PayloadUtils.generateAppId(mining);
        const minedAmount = PayloadUtils.calculateMinedAmount(mining.difficulty, mining.reward);



        // Deep clone template to avoid mutations
        const payload = JSON.parse(JSON.stringify(template));

        // Update the payload with actual values
        this._updatePayloadWithMiningData(payload, mining, resolvedAddress, walletData, minedAmount);

        // Handle proof data
        this._updatePayloadWithProofData(payload, proofData, mining);

        // Handle optional fields
        await this._updateOptionalFields(payload, mining, storedTx, template);

        // Log comprehensive diagnostics
        this._logPayloadDiagnostics(payload);

        // Detect leftover placeholders
        this._checkForPlaceholders(payload);

        // Sanity warnings
        this._performSanityChecks(payload);

        return payload;
    }



    /**
     * Fill missing transaction hex from mempool API
     * @private
     */
    async _fillMissingTxHex(mining) {
        if (!mining.txHex && mining.txid) {
            try {
                mining.txHex = await this.mempoolClient.fetchTxHex(mining.txid);
            } catch (e) {
                console.warn('⚠️ Could not fetch tx hex:', e.message);
            }
        }
    }

    /**
     * Update payload with mining data
     * @private
     */
    _updatePayloadWithMiningData(payload, mining, resolvedAddress, walletData, minedAmount) {
        // CRITICAL FIX: The tx field should contain the MINING TRANSACTION HEX (created in Step 3)
        payload.spell.private_inputs["$01"].tx = mining.txHex;
        console.log('🔧 Using mining transaction hex in payload (Step 3 transaction)');
        
        // Extract mining transaction ID for logging and validation
        const miningTxId = mining.txid || mining.transactionId || mining.miningTxId;
        if (miningTxId) {
            console.log('🆔 Mining transaction ID (Step 3):', miningTxId);
        } else {
            console.warn('⚠️  Mining transaction ID not explicitly provided in miningData');
        }
        
        // Use the MINING transaction UTXO with vout 1 (the token output)
        payload.spell.ins[0].utxo_id = `${mining.txid}:1`;
        payload.spell.outs[0].address = resolvedAddress || walletData.address;
        payload.spell.outs[0].charms["$01"] = minedAmount;
        

    }

    /**
     * Update payload with proof data
     * @private
     */
    _updatePayloadWithProofData(payload, proofData, mining) {

        
        if (proofData && (proofData.proof || proofData.blockProof || proofData.txBlockProof || proofData.merkleProof)) {
            const selectedProof = proofData.proof || proofData.blockProof || proofData.txBlockProof || proofData.merkleProof;
            payload.spell.private_inputs["$01"].tx_block_proof = selectedProof;
            

            
            // CRITICAL: Check that proof does not contain OLD input txid and ideally references the mining tx
            const oldTxId = mining.inputTxid;
            const expectedMiningTxId = mining.txid;
            const miningTxId = mining.txid || mining.transactionId || mining.miningTxId;
            
            if (selectedProof.includes(oldTxId)) {
                console.error('🚨🚨🚨 CRITICAL ERROR: Block proof contains OLD input transaction ID:', oldTxId);
                console.error('🚨🚨🚨 This proof is for the WRONG transaction! It should be for mining tx:', expectedMiningTxId);
            }
            
            if (selectedProof.includes(expectedMiningTxId)) {
                console.log('✅ CORRECT: Block proof contains expected mining transaction ID:', expectedMiningTxId);
            } else {
                console.error('🚨 ERROR: Block proof does NOT contain expected mining transaction ID:', expectedMiningTxId);
            }
            
            console.log('🔗 Using block proof for mining transaction (Step 3 tx)');
            if (miningTxId) {
                console.log('🔗 Block proof corresponds to mining tx:', miningTxId);
            }
        }

        if (!payload.spell.private_inputs["$01"].tx_block_proof) {
            const miningTxId = mining.txid || mining.transactionId || mining.miningTxId;
            console.warn('⚠️  tx_block_proof is missing in payload. Expecting proofData.proof (hex) from TxProofService for the mining transaction (Step 3)');
            if (miningTxId) {
                console.warn('⚠️  Missing block proof for mining transaction:', miningTxId);
            }
        } else {
            const proofHead = payload.spell.private_inputs["$01"].tx_block_proof.slice(0, 32);
            console.log('🔗 tx_block_proof length/head for mining transaction:', payload.spell.private_inputs["$01"].tx_block_proof.length, proofHead);
        }
    }

    /**
     * Update optional fields in payload
     * @private
     */
    async _updateOptionalFields(payload, mining, storedTx, template) {
        // prev_txs must include the raw hex of the mining transaction itself
        // This is the transaction that we're proving, which becomes the "previous transaction"
        // for the prover to reference
        let miningTxHex = null;
        try {
            // Use the mining transaction hex directly if available, otherwise fetch it
            if (mining.txHex) {
                miningTxHex = mining.txHex;
                console.log('✅ Using mining transaction hex from miningData');
            } else {
                miningTxHex = await this.mempoolClient.fetchTxHex(mining.txid);
                console.log('✅ Fetched mining transaction hex from mempool API');
            }
        } catch (e) {
            console.warn('Could not get mining tx hex for prev_txs:', e.message);
        }
        
        if (Array.isArray(payload.prev_txs)) {
            if (miningTxHex) {
                payload.prev_txs = [miningTxHex];
                console.log('🔗 Set prev_txs to mining transaction hex');
            } else {
                delete payload.prev_txs;
                console.warn('⚠️ Could not set prev_txs - no mining transaction hex available');
            }
        } else {
            delete payload.prev_txs;
        }

        // Funding/config fields
        const fundingVout = (storedTx && typeof storedTx.fundingVout === 'number') ? storedTx.fundingVout : 2;
        
        if ('funding_utxo' in template) {
            // Use MINING transaction ID with vout 2 (the funding/change output)
            payload.funding_utxo = `${mining.txid}:2`;
            console.log('🎯 Set funding_utxo to MINING transaction:', `${mining.txid}:2`);
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
            // Use MINING transaction (not parent) to get vout 2 value
            const miningTx = await this.mempoolClient.fetchTxJson(mining.txid);
            const vout = miningTx.vout?.[2]; // Always use vout 2 for funding
            if (!vout || typeof vout.value !== 'number') {
                console.warn('Could not derive funding_utxo_value from mining tx vout 2; vout missing or invalid');
            } else {
                // mempool API returns satoshis in vout.value
                payload.funding_utxo_value = vout.value;
                console.log('🔗 funding_utxo_value derived from MINING tx vout 2:', payload.funding_utxo_value);
            }
        } catch (e) {
            console.warn('Could not fetch MINING tx JSON for funding_utxo_value:', e.message);
        }
        
        if (!(typeof payload.funding_utxo_value === 'number' && payload.funding_utxo_value > 0)) {
            if (typeof mining.changeAmount === 'number' && mining.changeAmount > 0) {
                payload.funding_utxo_value = mining.changeAmount;
                console.log('🔁 funding_utxo_value fallback to miningData.changeAmount:', payload.funding_utxo_value);
            } else {
                console.warn('Removing funding_utxo_value: could not derive and no valid fallback.');
                delete payload.funding_utxo_value;
            }
        }
    }

    /**
     * Log comprehensive payload diagnostics
     * @private
     */
    _logPayloadDiagnostics(payload) {
        console.log('🧷 Replacement audit:', {
            appResourcePath: payload.spell.apps["$01"],
            txHexLen: payload.spell.private_inputs["$01"].tx?.length,
            txHexHead: payload.spell.private_inputs["$01"].tx?.slice(0, 24),
            txBlockProofType: typeof payload.spell.private_inputs["$01"].tx_block_proof,
            txBlockProofLen: payload.spell.private_inputs["$01"].tx_block_proof ? payload.spell.private_inputs["$01"].tx_block_proof.length : 0,
            utxo_in: payload.spell.ins[0].utxo_id,
            out_address: payload.spell.outs[0].address,
            output_amount: payload.spell.outs[0].charms["$01"],
            prev_txs_count: Array.isArray(payload.prev_txs) ? payload.prev_txs.length : 'n/a',
            prev_tx0_len: Array.isArray(payload.prev_txs) && payload.prev_txs[0] ? payload.prev_txs[0].length : 0,
            funding_utxo: payload.funding_utxo,
            funding_value_type: typeof payload.funding_utxo_value,
            change_address: payload.change_address,
            fee_rate_type: typeof payload.fee_rate,
            chain: payload.chain
        });
    }

    /**
     * Check for unresolved placeholders
     * @private
     */
    _checkForPlaceholders(payload) {
        const jsonPreview = JSON.stringify(payload);
        if (jsonPreview.includes('{{')) {
            console.warn('⚠️  Detected unresolved placeholders in payload JSON. Please review template and assignments.');
        } else {
            console.log('✅ No unresolved placeholders detected in payload.');
        }
    }

    /**
     * Perform sanity checks on payload
     * @private
     */
    _performSanityChecks(payload) {
        if (!Array.isArray(payload.prev_txs) || payload.prev_txs.length === 0) {
            console.warn('⚠️  prev_txs is empty; API typically requires parent transaction hex for each input.');
        }
        
        // Non-fatal validation: hex checks
        const hexRe = /^[0-9a-fA-F]+$/;
        if (payload.spell.private_inputs["$01"].tx && !hexRe.test(payload.spell.private_inputs["$01"].tx)) {
            console.warn('⚠️  tx field contains non-hex characters.');
        }
        if (payload.spell.private_inputs["$01"].tx_block_proof && !hexRe.test(payload.spell.private_inputs["$01"].tx_block_proof)) {
            console.warn('⚠️  tx_block_proof contains non-hex characters.');
        }
    }
}
