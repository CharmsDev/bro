import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
    root: 'src',
    plugins: [wasm(), topLevelAwait()],
    define: {
        global: 'globalThis',
        'process.env': {},
    },
    resolve: {
        alias: {
            buffer: 'buffer',
            crypto: 'crypto-browserify',
            stream: 'stream-browserify',
            util: 'util',
            process: 'process/browser',
        },
    },
    optimizeDeps: {
        include: [
            'buffer',
            'crypto-browserify',
            'stream-browserify',
            'util',
            'process/browser',
            'bitcoinjs-lib',
            'bip39',
            'bip32',
            'ecpair',
            'tiny-secp256k1',
            '@bitcoinerlab/secp256k1',
            '@noble/hashes',
            '@noble/secp256k1'
        ],
        exclude: [],
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
        },
    },
    build: {
        rollupOptions: {
            external: [],
            output: {
                globals: {
                    buffer: 'Buffer',
                },
            },
        },
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
});
