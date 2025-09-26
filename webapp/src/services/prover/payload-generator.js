
// Generates prover API payloads from mining and proof data
import { PROVER_CONFIG } from './config.js';
import { PayloadUtils } from './payload-utils.js';
import { TemplateLoader } from './template-loader.js';
import { PayloadValidator } from './payload-validator.js';
import QuickNodeClient from '../providers/quicknode/client.js';

// Handles payload generation for prover API requests
export class PayloadGenerator {
    constructor() {
        this.templateLoader = new TemplateLoader();
        this.quickNodeClient = new QuickNodeClient();
    }

    async generatePayload(miningData, proofData, walletData) {
        console.log('[PayloadGenerator] Starting payload generation...');
        try {
            console.log('[PayloadGenerator] Loading template...');
            const template = await this.templateLoader.loadTemplate();
            console.log('[PayloadGenerator] Template loaded, generating core payload...');
            const payload = await this._generatePayloadCore(miningData, proofData, walletData, template);
            console.log('[PayloadGenerator] Core payload generated, validating...');
            PayloadValidator.validatePayload(payload);
            console.log('[PayloadGenerator] ✅ Payload generation completed successfully');

            // await this._offerPayloadDownload(payload);

            return payload;
        } catch (error) {
            console.error('❌ Payload generation failed:', error);
            console.error('❌ Error stack:', error.stack);
            throw error;
        }
    }

    async _offerPayloadDownload(payload) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const defaultFilename = `payload-${timestamp}.json`;
            const jsonString = JSON.stringify(payload, null, 2);

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
                        return;
                    }
                }
            }

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
        }
    }

    async _generatePayloadCore(miningData, proofData, walletData, template) {
        console.log('[PayloadGenerator] _generatePayloadCore starting with:', {
            miningData,
            proofData,
            walletData,
            templateKeys: Object.keys(template || {})
        });
        
        let reward = (typeof miningData?.reward === 'number' && isFinite(miningData.reward)) ? miningData.reward : 0;
        console.log('[PayloadGenerator] Initial reward:', reward);

        // Fallback 1: AppState.miningReward
        if (!reward) {
            try {
                const appReward = window.appController?.appState?.miningReward;
                if (typeof appReward === 'number' && appReward > 0) {
                    reward = appReward;
                }
            } catch (_) {}
        }

        // Fallback 2: calculateRewardInfo with miningResult
        if (!reward && window.calculateRewardInfo) {
            try {
                const stateResult = window.appController?.appState?.miningResult || null;
                const miningResultStr = stateResult ? null : localStorage.getItem('miningResult');
                const miningResult = stateResult || (miningResultStr ? JSON.parse(miningResultStr) : null);
                if (miningResult?.bestNonce && miningResult?.bestHash) {
                    const info = window.calculateRewardInfo(miningResult.bestNonce, miningResult.bestHash);
                    reward = Number(info?.rawAmount) || 0;
                }
            } catch (_) {}
        }

        // Fallback 3: BitcoinMiner.loadMiningResult()
        if (!reward && window.calculateRewardInfo && window.BitcoinMiner) {
            try {
                const miner = new window.BitcoinMiner();
                const result = miner.loadMiningResult();
                if (result?.bestNonce && result?.bestHash) {
                    const info = window.calculateRewardInfo(result.bestNonce, result.bestHash);
                    reward = Number(info?.rawAmount) || 0;
                }
            } catch (_) {}
        }

        // Fallback 4: bestHash from mining progress
        if (!reward && window.calculateRewardInfo && window.BitcoinMiner) {
            try {
                const miner = new window.BitcoinMiner();
                const miningProgress = miner.loadMiningProgress();
                if (miningProgress?.bestHash && miningProgress?.bestNonce) {
                    const info = window.calculateRewardInfo(miningProgress.bestNonce, miningProgress.bestHash);
                    reward = Number(info?.rawAmount) || 0;
                    console.log(`[PayloadGenerator] Calculated reward from bestHash: ${reward} (${info?.formattedAmount} $BRO)`);
                }
            } catch (_) {}
        }


        let mining = {
            txid: miningData?.txid,
            txHex: miningData?.txHex,
            reward: reward,
            changeAmount: miningData?.changeAmount
        };

        await this._fillMissingTxHex(mining);

        const resolvedAddress = PayloadUtils.resolveWalletAddress(walletData);

        const appId = await PayloadUtils.generateAppId(mining);
        const minedAmount = Number(reward) || 0;

        console.log(`[PayloadGenerator] Hard-coded reward: ${reward}, minedAmount: ${minedAmount}`);


        const payload = JSON.parse(JSON.stringify(template));

        this._updatePayloadWithMiningData(payload, mining, resolvedAddress, walletData, minedAmount);

        this._updatePayloadWithProofData(payload, proofData, mining);

        await this._updateOptionalFields(payload, mining, miningData, template, walletData);

        return payload;
    }

    async _fillMissingTxHex(mining) {
        if (!mining.txHex && mining.txid) {
            try {
                mining.txHex = await this.quickNodeClient.getRawTransaction(mining.txid, false);
            } catch (e) {
            }
        }
    }

    _updatePayloadWithMiningData(payload, mining, resolvedAddress, walletData, minedAmount) {
        payload.spell.private_inputs["$01"].tx = mining.txHex;

        payload.spell.ins[0].utxo_id = `${mining.txid}:1`;
        payload.spell.outs[0].address = resolvedAddress || walletData.address;

        payload.spell.outs[0].charms["$01"] = minedAmount;
        
        console.log(`[PayloadGenerator] Final payload $01 amount: ${payload.spell.outs[0].charms["$01"]}`);
        
    }

    _updatePayloadWithProofData(payload, proofData, mining) {
        if (proofData && (proofData.proof || proofData.blockProof || proofData.txBlockProof || proofData.merkleProof)) {
            payload.spell.private_inputs["$01"].tx_block_proof = proofData.proof || proofData.blockProof || proofData.txBlockProof || proofData.merkleProof;
        }
    }

    async _updateOptionalFields(payload, mining, storedTx, template, walletData) {
        let miningTxHex = null;
        try {
            miningTxHex = mining.txHex || await this.quickNodeClient.getRawTransaction(mining.txid, false);
        } catch (e) {
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

        const fundingVout = (storedTx && typeof storedTx.fundingVout === 'number') ? storedTx.fundingVout : 2;

        if ('funding_utxo' in template) {
            payload.funding_utxo = `${mining.txid}:2`;
        } else {
            delete payload.funding_utxo;
        }

        if ('funding_utxo_value' in template) {
            await this._setFundingUtxoValue(payload, mining, fundingVout);
        } else {
            delete payload.funding_utxo_value;
        }

        if ('change_address' in template) {
            const resolvedAddress = PayloadUtils.resolveWalletAddress(walletData);
            payload.change_address = resolvedAddress;
        } else {
            delete payload.change_address;
        }

        if (!('fee_rate' in template)) delete payload.fee_rate;
        if (!('chain' in template)) delete payload.chain;
    }

    async _setFundingUtxoValue(payload, mining, fundingVout) {
        try {
            const miningTx = await this.quickNodeClient.getRawTransaction(mining.txid, true);
            const vout = miningTx.vout?.[2];

            if (vout && typeof vout.value === 'number') {
                payload.funding_utxo_value = Math.round(vout.value * 100000000);
            }
        } catch (e) {
        }

        // Fallback to changeAmount
        if (!(typeof payload.funding_utxo_value === 'number' && payload.funding_utxo_value > 0)) {
            if (typeof mining.changeAmount === 'number' && mining.changeAmount > 0) {
                payload.funding_utxo_value = mining.changeAmount;
            } else {
                delete payload.funding_utxo_value;
            }
        }
    }
}
