
```bash

export app_vk=$(charms app vk)
export in_utxo_0="4cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c:1"
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




/*

=== CHARMS PROVER REQUEST FORMAT ===

pub struct ProveRequest {
    pub spell: Spell,
    pub binaries: BTreeMap<B32, Vec<u8>>,
    pub prev_txs: Vec<String>,
    pub funding_utxo: UtxoId,
    pub funding_utxo_value: u64,
    pub change_address: String,
    pub fee_rate: f64,
    pub charms_fee: Option<CharmsFee>,
    pub chain: String,
}

Info:
- binaries: BTreeMap with B32 key and base64 encoded WASM binary as value
- funding_utxo: Format "txid:vout"
- funding_utxo_value: Value in satoshis
- chain: Use "bitcoin"

*/





/*

=== PARAMETERS GENERATED USING BITCOIN CORE COMMANDS ===

The following parameters were generated or need to be generated using Bitcoin Core:

1. app_id: Generated using SHA256 hash of input UTXO
   - Input UTXO: 4cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c:0
   - Command equivalent: echo -n "4cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c:0" | sha256sum
   - Generated: ${appId}

2. app_vk: App verification key (GENERATED)
   - Command: charms app vk
   - Generated value: 6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618

3. tx_block_proof: MISSING - needs to be generated
   - Commands needed:
     blockhash=$(bitcoin-cli getrawtransaction ${miningTxid} 1 | jq -r '.blockhash')
     bitcoin-cli gettxoutproof '["${miningTxid}"]' $blockhash

4. mining_tx: Raw transaction hex (already provided)
   - Command: bitcoin-cli getrawtransaction ${miningTxid}
   - Value: ${miningTxHex}

5. WASM binary hash: Generated using sha256sum
   - Command: sha256sum wasm/bro-token.wasm
   - Value: ${wasmHash}

MISSING DATA NEEDED:
- tx_block_proof: Bitcoin block proof for the mining transaction
*/
