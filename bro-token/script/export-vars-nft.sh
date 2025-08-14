
export app_vk=$(charms app vk)
export in_utxo_0="4988e8a6ad5eb660d1135075a2674135855b40ddbbabbe6dfa7a7207c241c278:1"
export app_id=$(echo -n "${in_utxo_0}" | sha256sum | cut -d' ' -f1)

export addr_0=$(b getnewaddress)

prev_txs=$(b getrawtransaction ${in_utxo_0%%:*})
app_bins=$(charms app build)

funding_utxo=4e97509ac6d3cc496c229a3433dd3bd2b495034a95a5eb21027d1a80a1b3829e:2
funding_utxo_value=$(b gettxout ${funding_utxo%%:*} ${funding_utxo##*:} | jq '(.value * 100000000) | floor')
change_address=$(b getrawchangeaddress)
