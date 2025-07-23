// Bitcoin Transaction Builder - Simplified for browser use
class BitcoinTransaction {
    constructor() {
        this.version = 1;
        this.inputs = [];
        this.outputs = [];
        this.locktime = 0;
    }

    // Add input (UTXO)
    addInput(txid, vout, scriptSig = '', sequence = 0xffffffff) {
        this.inputs.push({
            txid: txid,
            vout: vout,
            scriptSig: scriptSig,
            sequence: sequence
        });
    }

    // Add output
    addOutput(scriptPubKey, value) {
        this.outputs.push({
            scriptPubKey: scriptPubKey,
            value: value
        });
    }

    // Create OP_RETURN output with data
    addOpReturnOutput(data) {
        // OP_RETURN script: OP_RETURN + data length + data
        const dataBytes = this.stringToBytes(data);
        const script = [0x6a]; // OP_RETURN opcode

        if (dataBytes.length <= 75) {
            script.push(dataBytes.length); // Push data length
        } else {
            throw new Error('OP_RETURN data too large (max 75 bytes)');
        }

        script.push(...dataBytes);

        this.addOutput(this.bytesToHex(script), 0);
    }

    // Convert string to bytes
    stringToBytes(str) {
        return Array.from(new TextEncoder().encode(str));
    }

    // Convert bytes to hex
    bytesToHex(bytes) {
        return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Convert hex to bytes
    hexToBytes(hex) {
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return bytes;
    }

    // Reverse byte order (for little endian)
    reverseBytes(hex) {
        return hex.match(/.{2}/g).reverse().join('');
    }

    // Serialize transaction to hex
    serialize() {
        let tx = '';

        // Version (4 bytes, little endian)
        tx += this.reverseBytes(this.version.toString(16).padStart(8, '0'));

        // Input count (varint)
        tx += this.encodeVarint(this.inputs.length);

        // Inputs
        for (const input of this.inputs) {
            // Previous output hash (32 bytes, reversed)
            tx += this.reverseBytes(input.txid);
            // Previous output index (4 bytes, little endian)
            tx += this.reverseBytes(input.vout.toString(16).padStart(8, '0'));
            // Script length (varint)
            const scriptBytes = input.scriptSig ? this.hexToBytes(input.scriptSig) : [];
            tx += this.encodeVarint(scriptBytes.length);
            // Script
            tx += input.scriptSig || '';
            // Sequence (4 bytes, little endian)
            tx += this.reverseBytes(input.sequence.toString(16).padStart(8, '0'));
        }

        // Output count (varint)
        tx += this.encodeVarint(this.outputs.length);

        // Outputs
        for (const output of this.outputs) {
            // Value (8 bytes, little endian)
            tx += this.reverseBytes(output.value.toString(16).padStart(16, '0'));
            // Script length (varint)
            const scriptBytes = this.hexToBytes(output.scriptPubKey);
            tx += this.encodeVarint(scriptBytes.length);
            // Script
            tx += output.scriptPubKey;
        }

        // Locktime (4 bytes, little endian)
        tx += this.reverseBytes(this.locktime.toString(16).padStart(8, '0'));

        return tx;
    }

    // Encode varint
    encodeVarint(n) {
        if (n < 0xfd) {
            return n.toString(16).padStart(2, '0');
        } else if (n <= 0xffff) {
            return 'fd' + this.reverseBytes(n.toString(16).padStart(4, '0'));
        } else if (n <= 0xffffffff) {
            return 'fe' + this.reverseBytes(n.toString(16).padStart(8, '0'));
        } else {
            return 'ff' + this.reverseBytes(n.toString(16).padStart(16, '0'));
        }
    }

    // Calculate transaction ID (double SHA256 of serialized tx)
    async calculateTxId() {
        const txHex = this.serialize();
        const txBytes = this.hexToBytes(txHex);

        // Double SHA256
        const hash1 = await crypto.subtle.digest('SHA-256', new Uint8Array(txBytes));
        const hash2 = await crypto.subtle.digest('SHA-256', hash1);

        // Reverse for display (Bitcoin uses little endian for txids)
        const hashHex = this.bytesToHex(Array.from(new Uint8Array(hash2)));
        return this.reverseBytes(hashHex);
    }

    // Get transaction size in bytes
    getSize() {
        return this.hexToBytes(this.serialize()).length;
    }
}

// Export for use in other scripts
window.BitcoinTransaction = BitcoinTransaction;
