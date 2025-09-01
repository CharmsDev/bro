#!/usr/bin/env node
import { createHash } from 'crypto';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function parseArgs(argv) {
  // argv: [node, script, ...]
  const args = { wasm: undefined, out: undefined };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i];
    if (tok === '--out') {
      args.out = rest[i + 1];
      i++;
    } else if (!args.wasm) {
      args.wasm = tok;
    } else {
      // ignore extra tokens
    }
  }
  // Default to mainnet WASM file in the same directory
  if (!args.wasm) args.wasm = 'final.wasm';
  // Default output to wasm-info.json in the same directory
  if (!args.out) args.out = 'final.json';
  return args;
}

function main() {
  const { wasm, out } = parseArgs(process.argv);
  
  // Resolve paths relative to the script directory (tests/wasm/)
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const wasmPath = path.resolve(scriptDir, wasm);
  const outPath = path.resolve(scriptDir, out);

  if (!existsSync(wasmPath)) {
    console.error(`Error: file not found: ${wasmPath}`);
    process.exit(1);
  }

  const buf = readFileSync(wasmPath);
  const base64 = buf.toString('base64');
  const hash = sha256Hex(buf);

  const snippet = {
    binaries: { [hash]: base64 }
  };

  console.log('=== WASM INFO ===');
  console.log(`File: ${wasmPath}`);
  console.log(`Size: ${buf.length} bytes (~${Math.round(buf.length/1024)} KB)`);
  console.log(`SHA-256: ${hash}`);
  //console.log(`Base64 length: ${base64.length}`);
  console.log('');
  console.log('Paste into constants.js binaries');

  const output = snippet; // Write only the requested snippet: { binaries: { [hash]: base64 } }
  writeFileSync(outPath, JSON.stringify(output, null, 2));
}

main();
