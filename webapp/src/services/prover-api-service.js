export class ProverApiService {
    constructor() {
        this.apiUrl = 'https://charms-prover-test.fly.dev/spells/prove';
        // Default path (kept for logging/backward-compat), but loadPayloadTemplate now tries multiple strategies
        this.templatePath = '/src/assets/payload/request.json';
        this.wasmHash = '6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618';
        this.payloadTemplate = null;
    }

    // Load payload template
    async loadPayloadTemplate() {
        if (this.payloadTemplate) {
            return this.payloadTemplate;
        }

        try {
            console.log('📦 Loading payload template...');

            // Resolve candidate URLs with robust fallbacks (works in dev and build)
            const candidates = [];
            try {
                // Vite/ESM-friendly resolution
                const esmUrl = new URL('../assets/payload/request.json', import.meta.url).href;
                candidates.push(esmUrl);
            } catch (_) {
                // ignore if import.meta.url is unavailable
            }
            // Common public paths
            candidates.push(
                '/assets/payload/request.json',
                this.templatePath,
                'assets/payload/request.json'
            );

            console.log('🔎 Template URL candidates (in order):', candidates);

            let lastError = null;
            for (const url of candidates) {
                try {
                    console.log(`➡️  Trying to fetch template: ${url}`);
                    const resp = await fetch(url, { cache: 'no-cache' });
                    const ct = resp.headers.get('content-type') || 'unknown';
                    console.log(`   ↪ status=${resp.status} ${resp.statusText}, content-type=${ct}`);
                    const text = await resp.text();
                    const head = text.slice(0, 120).replace(/\n/g, ' ');
                    console.log(`   ↪ first-bytes: "${head}"`);
                    if (!resp.ok) {
                        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
                    }
                    // Guard: ensure not HTML
                    if (head.startsWith('<!DOCTYPE') || head.startsWith('<html')) {
                        throw new Error('Received HTML instead of JSON (likely 404 or dev server path)');
                    }
                    // Parse JSON
                    this.payloadTemplate = JSON.parse(text);
                    console.log('✅ Payload template loaded successfully from:', url);
                    return this.payloadTemplate;
                } catch (err) {
                    console.warn(`⚠️  Failed to load/parse template from ${url}:`, err.message);
                    lastError = err;
                }
            }

            throw new Error(`Failed to load payload template from all candidates. Last error: ${lastError?.message}`);
        } catch (error) {
            console.error('❌ Error loading payload template:', error);
            throw new Error(`Failed to load payload template: ${error.message}`);
        }
    }

    // Fetch raw transaction hex by txid from mempool.space (testnet4)
    async fetchTxHex(txid) {
        const url = `${this.mempoolBaseUrl}/tx/${txid}/hex`;
        console.log('🔎 Fetching raw tx hex:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch tx hex: ${res.status} ${res.statusText}`);
        const text = await res.text();
        if (!/^[0-9a-fA-F]+$/.test(text)) {
            throw new Error('Fetched tx hex is not valid hex');
        }
        return text.trim();
    }

    async fetchTxJson(txid) {
        const url = `${this.mempoolBaseUrl}/tx/${txid}`;
        console.log('🔎 Fetching tx JSON:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch tx JSON: ${res.status} ${res.statusText}`);
        return res.json();
    }

    // Generate complete payload for prover API
    async generatePayload(miningData, proofData, walletData) {
        console.log('🔧 Generating prover API payload...');
        console.log('🧩 Input summary:', {
            miningDataKeys: Object.keys(miningData || {}),
            proofDataKeys: Object.keys(proofData || {}),
            walletDataKeys: Object.keys(walletData || {})
        });
        
        // CRITICAL DEBUG: Log ALL miningData content to identify where transaction IDs come from
        console.log('🔍 COMPLETE miningData content:', JSON.stringify(miningData, null, 2));
        console.log('🔍 COMPLETE proofData content:', JSON.stringify(proofData, null, 2));
        
        // CRITICAL: Check for mining transaction ID in various possible keys
        console.log('🆔 TRANSACTION ID ANALYSIS:');
        console.log('  - miningData.inputTxid (OLD INPUT TX):', miningData?.inputTxid);
        console.log('  - miningData.txid (MINING TX?):', miningData?.txid);
        console.log('  - miningData.transactionId (MINING TX?):', miningData?.transactionId);
        console.log('  - miningData.miningTxId (MINING TX?):', miningData?.miningTxId);
        console.log('  - miningData.broadcastTxId (MINING TX?):', miningData?.broadcastTxId);
        
        // Check if the mining transaction ID is embedded in the tx hex
        if (miningData?.txHex) {
            console.log('🔍 Mining transaction hex length:', miningData.txHex.length);
            console.log('🔍 Mining transaction hex (first 100 chars):', miningData.txHex.substring(0, 100));
        }

        try {
            // Load payload template
            const template = await this.loadPayloadTemplate();
            console.log('🧾 Template keys (top-level):', Object.keys(template));

            // Ensure mempool base URL default to avoid undefined fetch URLs
            this.mempoolBaseUrl = this.mempoolBaseUrl || 'https://mempool.space/testnet4/api';

            // Log walletData and a safe localStorage dump for debugging address issues
            try {
                const lsKeys = Object.keys(localStorage || {}).filter(k => typeof localStorage.getItem === 'function');
                const lsDump = {};
                for (const k of lsKeys) {
                    try { lsDump[k] = localStorage.getItem(k); } catch (e) { /* ignore */ }
                }
                console.log('💾 localStorage dump (safe):', lsDump);
            } catch (_) { /* non-browser context */ }
            console.log('👛 walletData snapshot:', walletData);

            // Resolve wallet address from provided walletData or persisted bro_wallet_data
            let resolvedAddress = walletData && typeof walletData.address === 'string' ? walletData.address : null;
            if (!resolvedAddress) {
                try {
                    const persisted = localStorage.getItem('bro_wallet_data');
                    if (persisted) {
                        const parsed = JSON.parse(persisted);
                        if (parsed && typeof parsed.address === 'string') resolvedAddress = parsed.address;
                    }
                } catch (e) {
                    console.warn('Could not read bro_wallet_data from localStorage:', e.message);
                }
            }
            if (!resolvedAddress) {
                console.warn('Wallet address unresolved; change_address may fail validation');
            }

            // Generate app_id from the mining transaction input UTXO
            const appId = await this.generateAppId(miningData);
            console.log('🧮 appId generated from input UTXO:', appId);

            // Calculate mined amount (from mining result)
            const minedAmount = this.calculateMinedAmount(miningData.difficulty, miningData.reward);
            console.log('💰 minedAmount (smallest unit):', minedAmount);

            // Clone the template to avoid modifying the original
            const payload = JSON.parse(JSON.stringify(template));
            console.log('🧪 Cloned template created.');

            // Update the payload with actual values
            //payload.spell.apps["$01"] = `t/${appId}/${this.wasmHash}`; // hardcoded in the template - RJJ-TODO finish cleanup
            
            // CRITICAL FIX: The tx field should contain the MINING TRANSACTION HEX (created in Step 3)
            // This is the transaction that contains the OP_RETURN with mining data and creates the outputs
            payload.spell.private_inputs["$01"].tx = miningData.txHex;
            console.log('🔧 Using mining transaction hex in payload (Step 3 transaction)');
            
            // Extract mining transaction ID from the transaction hex for logging and validation
            // The mining transaction ID should be derivable from miningData or available directly
            const miningTxId = miningData.txid || miningData.transactionId || miningData.miningTxId;
            if (miningTxId) {
                console.log('🆔 Mining transaction ID (Step 3):', miningTxId);
            } else {
                console.warn('⚠️  Mining transaction ID not explicitly provided in miningData');
            }
            
            // Use the INPUT UTXO for ins[0].utxo_id (the UTXO being spent by the mining transaction)
            payload.spell.ins[0].utxo_id = `${miningData.inputTxid}:${miningData.inputVout}`;
            payload.spell.outs[0].address = resolvedAddress || walletData.address;
            payload.spell.outs[0].charms["$01"] = minedAmount;
            
            // CRITICAL FIX: tx_block_proof should be for the MINING TRANSACTION (Step 3), not the input transaction
            // The proofData should contain the block proof for the mining transaction that was confirmed
            console.log('🚨 CRITICAL ANALYSIS - BLOCK PROOF SOURCE:');
            console.log('  - proofData.proof:', proofData?.proof?.substring(0, 100) + '...');
            console.log('  - proofData.blockProof:', proofData?.blockProof?.substring(0, 100) + '...');
            console.log('  - proofData.txBlockProof:', proofData?.txBlockProof?.substring(0, 100) + '...');
            console.log('  - proofData.merkleProof:', proofData?.merkleProof?.substring(0, 100) + '...');
            
            if (proofData && (proofData.proof || proofData.blockProof || proofData.txBlockProof || proofData.merkleProof)) {
                const selectedProof = proofData.proof || proofData.blockProof || proofData.txBlockProof || proofData.merkleProof;
                payload.spell.private_inputs["$01"].tx_block_proof = selectedProof;
                
                console.log('🚨 SELECTED BLOCK PROOF (first 100 chars):', selectedProof.substring(0, 100));
                
                // CRITICAL: Check if this proof contains the OLD transaction ID (should NOT)
                const oldTxId = miningData.inputTxid;
                const expectedMiningTxId = '0f67c80c15fe45880acb95ba650852a9d11fbbe889c605b02486fba2fc79b6ef';
                
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
                console.warn('⚠️  tx_block_proof is missing in payload. Expecting proofData.proof (hex) from TxProofService for the mining transaction (Step 3)');
                if (miningTxId) {
                    console.warn('⚠️  Missing block proof for mining transaction:', miningTxId);
                }
            } else {
                const proofHead = payload.spell.private_inputs["$01"].tx_block_proof.slice(0, 32);
                console.log('🔗 tx_block_proof length/head for mining transaction:', payload.spell.private_inputs["$01"].tx_block_proof.length, proofHead);
            }

            // prev_txs must include the raw hex of the parent transaction(s) that created the input UTXO(s)
            // Fetch parent tx hex for inputTxid when not provided
            // Optional fields: align with known-good schema. Only set if template expects them.
            let parentHex = null;
            try {
                parentHex = await this.fetchTxHex(miningData.inputTxid);
            } catch (e) {
                console.warn('Could not fetch parent tx hex for prev_txs:', e.message);
            }
            if (Array.isArray(payload.prev_txs)) {
                if (parentHex) {
                    payload.prev_txs = [parentHex];
                } else {
                    delete payload.prev_txs;
                }
            } else {
                delete payload.prev_txs;
            }
            // Funding/config fields are optional for the prover; if present in template, align to parent tx
            const fundingVout = (typeof miningData.fundingVout === 'number') ? miningData.fundingVout : 2;
            if ('funding_utxo' in template) {
                payload.funding_utxo = `${miningData.inputTxid}:${fundingVout}`;
            } else {
                delete payload.funding_utxo;
            }
            if ('funding_utxo_value' in template) {
                try {
                    const parentTx = await this.fetchTxJson(miningData.inputTxid);
                    const vout = parentTx.vout?.[fundingVout];
                    if (!vout || typeof vout.value !== 'number') {
                        console.warn('Could not derive funding_utxo_value from parent tx; vout missing or invalid');
                    } else {
                        // mempool API returns satoshis in vout.value
                        payload.funding_utxo_value = vout.value;
                        console.log('🔗 funding_utxo_value derived from parent tx vout:', payload.funding_utxo_value);
                    }
                } catch (e) {
                    console.warn('Could not fetch parent tx JSON for funding_utxo_value:', e.message);
                }
                if (!(typeof payload.funding_utxo_value === 'number' && payload.funding_utxo_value > 0)) {
                    if (typeof miningData.changeAmount === 'number' && miningData.changeAmount > 0) {
                        payload.funding_utxo_value = miningData.changeAmount;
                        console.log('🔁 funding_utxo_value fallback to miningData.changeAmount:', payload.funding_utxo_value);
                    } else {
                        console.warn('Removing funding_utxo_value: could not derive and no valid fallback.');
                        delete payload.funding_utxo_value;
                    }
                }
            } else {
                delete payload.funding_utxo_value;
            }
            // Other optional config
            if ('change_address' in template) {
                payload.change_address = resolvedAddress || walletData.address;
            } else {
                delete payload.change_address;
            }
            if (!('fee_rate' in template)) delete payload.fee_rate;
            if (!('chain' in template)) delete payload.chain;

            // Comprehensive diagnostics: enumerate replacements and types
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

            // Detect leftover placeholders
            const jsonPreview = JSON.stringify(payload);
            if (jsonPreview.includes('{{')) {
                console.warn('⚠️  Detected unresolved placeholders in payload JSON. Please review template and assignments.');
            } else {
                console.log('✅ No unresolved placeholders detected in payload.');
            }

            // Sanity warnings for potential mismatches
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

            // Validate payload before returning
            this.validatePayload(payload);

            // Save payload to disk for review
            await this.savePayloadToDisk(payload);

            console.log('✅ Payload generated successfully');
            return payload;

        } catch (error) {
            console.error('❌ Error generating payload:', error);
            throw error;
        }
    }

    // Generate app_id from input UTXO using SHA256
    async generateAppId(miningData) {
        // Use the actual input UTXO from the mining transaction
        const appUtxo = `${miningData.inputTxid}:${miningData.inputVout}`;

        const encoder = new TextEncoder();
        const data = encoder.encode(appUtxo);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        const hashHex = Array.from(hashArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        console.log(`📝 Generated app_id: ${hashHex} from UTXO: ${appUtxo}`);
        return hashHex;
    }



    // Calculate mined amount based on difficulty and reward
    calculateMinedAmount(difficulty, baseReward = 144.5) {
        // Convert to smallest unit (equivalent to satoshis)
        // Use the actual reward from the mining calculation
        const broTokens = baseReward;
        const smallestUnit = broTokens * 100000000; // 8 decimal places like Bitcoin

        console.log(`💰 Calculated mined amount: ${broTokens} BRO (${smallestUnit} smallest units)`);
        return smallestUnit;
    }

    // Send payload to prover API
    async sendToProver(payload) {
        console.log('🚀 Sending payload to prover API...');

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const contentType = response.headers.get('content-type') || 'unknown';
            const rawText = await response.text();
            console.log('📥 Prover response meta:', {
                status: response.status,
                ok: response.ok,
                contentType,
                bodyPreview: rawText.slice(0, 160)
            });

            if (!response.ok) {
                // Do not attempt to parse JSON on error; surface raw details
                throw new Error(`Prover API error: ${response.status} ${response.statusText} | content-type=${contentType} | body=${rawText.slice(0, 800)}`);
            }

            // Try to parse as JSON only on success
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (jsonError) {
                console.error('❌ Error parsing JSON response (success status):', jsonError.message);
                throw new Error(`Invalid JSON success response from prover API: ${rawText}`);
            }

            // Validate response format
            this.validateProverResponse(data);

            console.log('✅ Prover API request successful');
            return data;

        } catch (error) {
            console.error('❌ Error sending to prover API:', error);
            throw error;
        }
    }

    // Validate payload structure
    validatePayload(payload) {
        console.log('🔍 Validating payload structure...');

        const requiredFields = [
            'spell',
            'binaries'
        ];

        for (const field of requiredFields) {
            if (!payload.hasOwnProperty(field)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate spell structure
        if (!payload.spell.version) {
            throw new Error('Missing spell.version');
        }
        if (!payload.spell.apps || Object.keys(payload.spell.apps).length === 0) {
            throw new Error('Missing or empty spell.apps');
        }
        if (!payload.spell.ins || payload.spell.ins.length === 0) {
            throw new Error('Missing or empty spell.ins');
        }
        if (!payload.spell.outs || payload.spell.outs.length === 0) {
            throw new Error('Missing or empty spell.outs');
        }

        // Validate required private inputs
        const pi = payload.spell.private_inputs?.["$01"];
        if (!pi) {
            throw new Error('Missing spell.private_inputs["$01"]');
        }
        const hexRe = /^[0-9a-fA-F]+$/;
        if (!pi.tx || !hexRe.test(pi.tx)) {
            throw new Error('Invalid or missing tx hex in private inputs');
        }
        if (!pi.tx_block_proof || !hexRe.test(pi.tx_block_proof)) {
            throw new Error('Invalid or missing tx_block_proof (expected hex)');
        }

        // prev_txs optional; if present, validate format
        if (payload.prev_txs !== undefined) {
            if (!Array.isArray(payload.prev_txs) || payload.prev_txs.length === 0) {
                throw new Error('prev_txs must include at least one parent transaction hex when provided');
            }
            if (!hexRe.test(payload.prev_txs[0])) {
                throw new Error('prev_txs[0] must be hex');
            }
        }

        // Validate data types
        if (typeof payload.spell.version !== 'number') {
            throw new Error('spell.version must be a number');
        }
        if (payload.funding_utxo_value !== undefined) {
            if (typeof payload.funding_utxo_value !== 'number' || !(payload.funding_utxo_value > 0)) {
                throw new Error('funding_utxo_value must be a positive number when provided');
            }
        }
        if (typeof payload.fee_rate !== 'number') {
            throw new Error('fee_rate must be a number');
        }

        // Basic format checks
        if (!/^([0-9a-fA-F]{64}):(\d+)$/.test(payload.spell.ins[0].utxo_id)) {
            throw new Error('ins[0].utxo_id must be <txid>:<vout>');
        }
        if (payload.funding_utxo !== undefined) {
            if (!/^([0-9a-fA-F]{64}):(\d+)$/.test(payload.funding_utxo)) {
                throw new Error('funding_utxo must be <txid>:<vout> when provided');
            }
        }
        if (typeof payload.spell.outs[0].charms?.["$01"] !== 'number') {
            throw new Error('outs[0].charms["$01"] must be a number');
        }
        if (payload.change_address !== undefined) {
            if (typeof payload.change_address !== 'string' || payload.change_address.length < 20) {
                throw new Error('change_address appears invalid');
            }
        }

        // Validate WASM binary
        const wasmHashes = Object.keys(payload.binaries);
        if (wasmHashes.length === 0) {
            throw new Error('No WASM binaries found in payload');
        }

        for (const hash of wasmHashes) {
            const wasmBinary = payload.binaries[hash];
            if (!wasmBinary || wasmBinary.length === 0) {
                throw new Error(`Empty WASM binary for hash: ${hash}`);
            }
        }

        // Calculate payload size
        const payloadSize = JSON.stringify(payload).length;
        console.log(`📊 Payload size: ${Math.round(payloadSize / 1024)} KB`);

        console.log('✅ Payload validation passed');
    }

    // Validate prover API response
    validateProverResponse(response) {
        console.log('🔍 Validating prover response...');

        // Expected response should contain transaction data
        // Based on the example, it should be an array of hex strings
        if (!Array.isArray(response)) {
            throw new Error('Prover response should be an array of transactions');
        }

        if (response.length === 0) {
            throw new Error('Prover response is empty');
        }

        // Validate each transaction is a hex string
        for (let i = 0; i < response.length; i++) {
            const tx = response[i];
            if (typeof tx !== 'string') {
                throw new Error(`Transaction ${i} is not a string`);
            }
            if (!/^[0-9a-fA-F]+$/.test(tx)) {
                throw new Error(`Transaction ${i} is not valid hex: ${tx.substring(0, 50)}...`);
            }
        }

        console.log(`✅ Prover response validation passed: ${response.length} transactions`);
    }

    // Get payload size information
    getPayloadInfo(payload) {
        const jsonString = JSON.stringify(payload);
        const totalSize = jsonString.length;

        // Calculate WASM binary size
        let wasmSize = 0;
        for (const hash in payload.binaries) {
            wasmSize += payload.binaries[hash].length;
        }

        return {
            totalSize,
            totalSizeKB: Math.round(totalSize / 1024),
            wasmSize,
            wasmSizeKB: Math.round(wasmSize * 0.75 / 1024), // Base64 to binary conversion
            jsonSize: totalSize - wasmSize,
            jsonSizeKB: Math.round((totalSize - wasmSize) / 1024)
        };
    }

    // Save payload to disk for review
    async savePayloadToDisk(payload) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `payload_${timestamp}.json`;

        console.log('🔍 Payload object keys:', Object.keys(payload));
        console.log('🔍 Binaries keys:', payload.binaries ? Object.keys(payload.binaries) : 'none');
        if (payload.binaries) {
            for (const [hash, binary] of Object.entries(payload.binaries)) {
                console.log(`🔍 WASM binary ${hash}: ${binary.length} chars`);
            }
        }

        console.log('🔍 Starting JSON.stringify...');
        const payloadJson = JSON.stringify(payload, null, 2);
        console.log(`🔍 JSON.stringify completed: ${payloadJson.length} chars (${Math.round(payloadJson.length / 1024)} KB)`);

        try {
            // Method 1: Try File System Access API (modern browsers)
            if ('showSaveFilePicker' in window) {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'JSON files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(payloadJson);
                await writable.close();
                console.log(`💾 Payload guardado exitosamente como: ${filename}`);
                return;
            }
        } catch (error) {
            console.log('⚠️ File System Access API no disponible, intentando descarga...');
        }

        try {
            // Method 2: Traditional download
            const blob = new Blob([payloadJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                if (document.body.contains(a)) {
                    document.body.removeChild(a);
                }
                URL.revokeObjectURL(url);
            }, 1000);

            console.log(`💾 Payload descargado como: ${filename}`);
            console.log(`📁 Revisa tu carpeta de Descargas`);

        } catch (downloadError) {
            console.error('❌ Error en descarga:', downloadError);

            // Method 3: Save to localStorage as fallback
            try {
                localStorage.setItem(`bro_payload_${timestamp}`, payloadJson);
                console.log(`💾 Payload guardado en localStorage como: bro_payload_${timestamp}`);
                console.log(`📋 Puedes copiarlo desde las DevTools > Application > Local Storage`);
                console.log(`📊 Tamaño: ${Math.round(payloadJson.length / 1024)} KB`);
            } catch (storageError) {
                console.error('❌ Error guardando en localStorage:', storageError);
                console.log('📋 PAYLOAD COMPLETO (copia manualmente):');
                console.log(payloadJson);
            }
        }
    }
}
