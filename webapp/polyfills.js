// Polyfills for Node.js modules in browser environment
import { Buffer } from 'buffer';

// Make Buffer available globally before any other imports
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
    window.global = window;
}

if (typeof globalThis !== 'undefined') {
    globalThis.Buffer = Buffer;
    globalThis.global = globalThis;
}

// Export Buffer for explicit imports
export { Buffer };
