## Pre-requisites

Install `wasm32-unknown-unknown` target, `wasm-bindgen` CLI:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli
```

## Build

Compile Wasm module:

```bash
cargo build --release --target wasm32-unknown-unknown
```

Re-generate bindings for use from JS:

```bash
wasm-bindgen --out-dir ./target/wasm-bindgen --target nodejs target/wasm32-unknown-unknown/release/libbro.wasm
```
