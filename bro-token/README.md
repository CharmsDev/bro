This is a [Charms](https://charms.dev) app.

Build with:

```sh
charms app build
```

The resulting Wasm binary will show up at `./target/wasm32-wasip1/release/bro-token.wasm`.

NOTE: We have included the app binary as the canonical BRO token app at `./src/wasm/bro-token.wasm`.

Get the verification key for the app with:

```sh
charms app vk ./src/wasm/bro-token.wasm
```
