#!/usr/bin/env node
import { createHash } from 'crypto';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

function usage() {
  console.log('Usage: node tests/gen-wasm-info.js <path-to-wasm> [--out <output.json>]');
  console.log('Examples:');
  console.log('  node tests/gen-wasm-info.js ./wasm/bro-token-2.wasm');
  console.log('  node tests/gen-wasm-info.js ./wasm/bro-token-2.wasm --out tests/wasm-info.json');
}

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
  if (!args.wasm) args.wasm = './wasm/bro-token-2.wasm';
  return args;
}

function main() {
  const { wasm, out } = parseArgs(process.argv);
  const wasmPath = path.resolve(process.cwd(), wasm);

  if (!existsSync(wasmPath)) {
    console.error(`Error: file not found: ${wasmPath}`);
    usage();
    process.exit(1);
  }

  const buf = readFileSync(wasmPath);
  const base64 = buf.toString('base64');
  const hash = sha256Hex(buf);

  const snippet = {
    binaries: { [hash]: base64 }
  };

  /*
  console.log('=== WASM INFO ===');
  console.log(`File: ${wasmPath}`);
  console.log(`Size: ${buf.length} bytes (~${Math.round(buf.length/1024)} KB)`);
  console.log(`SHA-256: ${hash}`);
  console.log(`Base64 length: ${base64.length}`);
  console.log('');

  console.log('=== Paste into constants.js binaries ===');
  console.log('"binaries": {');
  console.log(`  "${hash}": "${base64}"`);
  console.log('}');
  console.log('');

  console.log('=== Individual values ===');
  console.log(`const wasmHash = '${hash}';`);
  console.log('const wasmBase64 = `');
  console.log(base64);
  console.log('`;');
  */

  if (out) {
    const outPath = path.resolve(process.cwd(), out);
    const output = snippet; // Write only the requested snippet: { binaries: { [hash]: base64 } }
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Wrote JSON snippet to: ${outPath}`);
  }
}

main();
