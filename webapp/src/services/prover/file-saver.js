/**
 * File Saver Module
 * Handles saving payloads to disk for review
 */

import { PayloadUtils } from './payload-utils.js';

export class FileSaver {
    /**
     * Save payload to disk for review
     * @param {Object} payload - The payload to save
     */
    static async savePayloadToDisk(payload) {
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
                await FileSaver._saveWithFileSystemAPI(filename, payloadJson);
                return;
            }
        } catch (error) {
            console.log('⚠️ File System Access API no disponible, intentando descarga...');
        }

        try {
            // Method 2: Traditional download
            FileSaver._saveWithDownload(filename, payloadJson);
        } catch (downloadError) {
            console.error('❌ Error en descarga:', downloadError);
            // Method 3: Save to localStorage as fallback
            FileSaver._saveToLocalStorage(timestamp, payloadJson);
        }
    }

    /**
     * Save using File System Access API
     * @private
     */
    static async _saveWithFileSystemAPI(filename, payloadJson) {
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
    }

    /**
     * Save using traditional download
     * @private
     */
    static _saveWithDownload(filename, payloadJson) {
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
    }

    /**
     * Save to localStorage as fallback
     * @private
     */
    static _saveToLocalStorage(timestamp, payloadJson) {
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
