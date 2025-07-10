# Miner

Small demonstration of a Proof-of-Work miner written in TypeScript. It keeps hashing an input plus a nonce until the hash starts with a number of zeroes. The mined nonce and hash are then embedded in an unsigned Bitcoin transaction via an `OP_RETURN` output.

## Usage

From this folder:

```sh
npm install
npx ts-node src/index.ts <difficulty>
```

The optional `difficulty` parameter sets how many zeroes the hash must start with (default `2`). Every attempt is printed to the console. When a valid hash is found, a testnet transaction hex containing the result is printed. Edit `src/index.ts` to provide real UTXO and destination data.
