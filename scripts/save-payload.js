#!/usr/bin/env node

/**
 * Script para guardar payload desde localStorage al directorio deseado
 * Uso: node save-payload.js [timestamp]
 */

const fs = require('fs');
const path = require('path');

// Directorio de destino para los payloads
const PAYLOAD_DIR = '/Users/ricartjuncadella/Documents/Prj/bitcoinos/charms-bro/tests/payloads';

// Asegurar que el directorio existe
if (!fs.existsSync(PAYLOAD_DIR)) {
    fs.mkdirSync(PAYLOAD_DIR, { recursive: true });
    console.log(`📁 Directorio creado: ${PAYLOAD_DIR}`);
}

// Función para guardar payload desde localStorage
function savePayloadFromLocalStorage(timestamp) {
    const localStorageKey = `bro_payload_${timestamp}`;
    
    // En un entorno real, necesitarías extraer esto del navegador
    // Por ahora, este script puede ser usado manualmente
    console.log(`🔍 Buscando payload con clave: ${localStorageKey}`);
    console.log(`📁 Directorio de destino: ${PAYLOAD_DIR}`);
    console.log(`
📋 INSTRUCCIONES:
1. Abre DevTools > Application > Local Storage
2. Busca la clave: ${localStorageKey}
3. Copia el valor JSON completo
4. Pégalo en un archivo llamado: payload_${timestamp}.json
5. Guárdalo en: ${PAYLOAD_DIR}

O alternativamente:
- Usa la descarga automática del navegador
- Mueve el archivo desde Descargas a: ${PAYLOAD_DIR}
    `);
}

// Función para guardar payload directamente
function savePayload(payloadData, timestamp) {
    if (!timestamp) {
        timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }
    
    const filename = `payload_${timestamp}.json`;
    const filepath = path.join(PAYLOAD_DIR, filename);
    
    try {
        const payloadJson = typeof payloadData === 'string' ? payloadData : JSON.stringify(payloadData, null, 2);
        fs.writeFileSync(filepath, payloadJson, 'utf8');
        
        const stats = fs.statSync(filepath);
        const sizeKB = Math.round(stats.size / 1024);
        
        console.log(`✅ Payload guardado exitosamente:`);
        console.log(`📁 Archivo: ${filepath}`);
        console.log(`📊 Tamaño: ${sizeKB} KB`);
        
        return filepath;
    } catch (error) {
        console.error(`❌ Error guardando payload:`, error.message);
        return null;
    }
}

// Función para listar payloads existentes
function listPayloads() {
    try {
        const files = fs.readdirSync(PAYLOAD_DIR)
            .filter(file => file.startsWith('payload_') && file.endsWith('.json'))
            .sort()
            .reverse(); // Más recientes primero
        
        if (files.length === 0) {
            console.log('📂 No hay payloads guardados aún');
            return;
        }
        
        console.log(`📂 Payloads encontrados en ${PAYLOAD_DIR}:`);
        files.forEach((file, index) => {
            const filepath = path.join(PAYLOAD_DIR, file);
            const stats = fs.statSync(filepath);
            const sizeKB = Math.round(stats.size / 1024);
            const date = stats.mtime.toLocaleString();
            console.log(`${index + 1}. ${file} (${sizeKB} KB, ${date})`);
        });
    } catch (error) {
        console.error(`❌ Error listando payloads:`, error.message);
    }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'list':
        listPayloads();
        break;
    case 'help':
        console.log(`
📋 COMANDOS DISPONIBLES:

node save-payload.js list          - Listar payloads guardados
node save-payload.js help          - Mostrar esta ayuda
node save-payload.js [timestamp]   - Mostrar instrucciones para timestamp específico

DIRECTORIO: ${PAYLOAD_DIR}
        `);
        break;
    default:
        if (command) {
            savePayloadFromLocalStorage(command);
        } else {
            console.log('💾 Script de guardado de payloads');
            console.log('Usa "node save-payload.js help" para ver comandos disponibles');
            listPayloads();
        }
        break;
}

module.exports = { savePayload, listPayloads, PAYLOAD_DIR };
