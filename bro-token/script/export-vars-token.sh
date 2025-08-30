app_bins=./src/wasm/bro-token.wasm

export app_vk=$(charms app vk ${app_bins})
export in_utxo_0="4988e8a6ad5eb660d1135075a2674135855b40ddbbabbe6dfa7a7207c241c278:1"
export app_id=$(echo -n "${in_utxo_0}" | sha256sum | cut -d' ' -f1)
export mining_txid=732337e4a15ef24b2e49f83ab397e305e60563615fc9710aa5616e68e2e66774
export mining_tx=$(b getrawtransaction ${mining_txid})

blockhash=$(b getrawtransaction $mining_txid 1 | jq -r '.blockhash')

export tx_block_proof=$(b gettxoutproof '["'${mining_txid}'"]' ${blockhash})
export addr_0=$(b getnewaddress)
export addr_1=$(b getnewaddress)
export mined_amount=36100000000

prev_txs=$(b getrawtransaction ${mining_txid})

funding_utxo=c29691b6cd86132a01708ae01d466b5a16f4d623fcd23a25aa658501817fb3e1:1
funding_utxo_value=$(b gettxout ${funding_utxo%%:*} ${funding_utxo##*:} | jq '(.value * 100000000) | floor')
change_address=$(b getrawchangeaddress)
