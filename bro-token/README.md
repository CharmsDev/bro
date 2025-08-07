This is a [Charms](https://charms.dev) app.

It is a simple fungible token managed by a reference NFT. The NFT has a state that specifies the remaining total supply
of the tokens available to mint. If you control the NFT, you can mint new tokens.

Build with:

```sh
charms app build
```

The resulting Wasm binary will show up at `./target/wasm32-wasip1/release/bro-token.wasm`.

Get the verification key for the app with:

```sh
charms app vk
```

Test the app with a simple NFT mint example:

```sh
export app_vk=$(charms app vk)

# set to a UTXO you're spending (you can see what you have by running `b listunspent`)
export in_utxo_0="a2889190343435c86cd1c2b70e58efed0d101437a753e154dff1879008898cd2:2"

export app_id=$(echo -n "${in_utxo_0}" | sha256sum | cut -d' ' -f1)
export addr_0="tb1p3w06fgh64axkj3uphn4t258ehweccm367vkdhkvz8qzdagjctm8qaw2xyv"

cat ./spells/mint-nft.yaml | envsubst | charms app run
```

Mint BRO:

```bash

export app_vk=$(charms app vk)
export in_utxo_0="a2889190343435c86cd1c2b70e58efed0d101437a753e154dff1879008898cd2:2"
export app_id=$(echo -n "${in_utxo_0}" | sha256sum | cut -d' ' -f1)                  
export mining_txid=732337e4a15ef24b2e49f83ab397e305e60563615fc9710aa5616e68e2e66774
export mining_tx=$(b getrawtransaction ${mining_txid})

blockhash=$(b getrawtransaction $mining_txid 1 | jq -r '.blockhash')

export tx_block_proof=$(b gettxoutproof '["'${mining_txid}'"]' ${blockhash})
export addr_1=$(b getnewaddress)
export mined_amount=36100000000

prev_txs=$(b getrawtransaction ${mining_txid})                                                  
app_bins=$(charms app build)

cat ./spells/mint-token.yaml | envsubst | charms spell check --app-bins=$app_bins --prev-txs=$prev_txs

```