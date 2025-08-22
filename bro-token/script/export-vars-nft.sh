
export app_vk=$(charms app vk)
export in_utxo_0="3ba4c00dc0041226f456ac694a4317f9e013a8b47a3d6ec326c5b1dd110ef20c:0"
export app_id=$(echo -n "${in_utxo_0}" | sha256sum | cut -d' ' -f1)

export addr_0=$(b getnewaddress)

prev_txs=$(b getrawtransaction ${in_utxo_0%%:*})
app_bins=$(charms app build)

funding_utxo=73ca66856388e47a490b32b1befbe6ee8c5c2e4f4e7e41af1d34d1285b41024a:2
funding_utxo_value=$(b gettxout ${funding_utxo%%:*} ${funding_utxo##*:} | jq '(.value * 100000000) | floor')
change_address=$(b getrawchangeaddress)
