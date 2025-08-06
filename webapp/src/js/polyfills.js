import { Buffer } from 'buffer';
import process from 'process';

// Global polyfills for bitcoinjs-lib compatibility
window.Buffer = Buffer;
window.global = window;
window.process = process;

if (!window.crypto) {
    window.crypto = {};
}

if (!window.crypto.getRandomValues) {
    // Fallback random number generator
    window.crypto.getRandomValues = function (array) {
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    };
}
