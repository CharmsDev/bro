app_bins=$(charms app build)

export app_vk=$(charms app vk ${app_bins})
export in_utxo_0="344c5dcb694f18fd0c31e5d1897efe2d33ffafcd2f1904e0f78cb7c26f9d885b:1"
export app_id=$(echo -n "${in_utxo_0}" | sha256sum | cut -d' ' -f1)

export addr_0=$(b getnewaddress)

prev_txs=$(b getrawtransaction ${in_utxo_0%%:*})

funding_utxo=4e97509ac6d3cc496c229a3433dd3bd2b495034a95a5eb21027d1a80a1b3829e:2
funding_utxo_value=$(b gettxout ${funding_utxo%%:*} ${funding_utxo##*:} | jq '(.value * 100000000) | floor')
change_address=$(b getrawchangeaddress)
