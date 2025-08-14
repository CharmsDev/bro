let txs = ["0200000001efb679fca2fb8624b005c689e8bb1fd1a9520865ba95cb0a8845fe150cc8670f0200000000ffffffff01d331090000000000225120bf9c20f64ea379fce6511b0ca1f92f6013c9fc5ee95a73608824fcd08aa3fc7d00000000", "02000000000102efb679fca2fb8624b005c689e8bb1fd1a9520865ba95cb0a8845fe150cc8670f0100000000ffffffff1802e59016163194897eaeeaae1c5961410d314d288bdc2f28c52e9057bec1620000000000ffffffff03e803000000000000225120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684ce8030000000000001600141db4ded10fa155036bfb40717ea68022be899fbb5c2b090000000000225120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c000341f8f7e94967a8a0f897d2dc1abc141977d8ea6ef6706f63f34ed2cdaeb2ea4903e6da74d9e2d20f9bea2e6e047eb26979d1daad59e7e006a305f7385091dc205b81fdd0020063057370656c6c4d080282a36776657273696f6e06627478a1646f75747381a1001b000000035d498080716170705f7075626c69635f696e70757473a18361749820187c18f818ee1871188618e40f187b18d910183218d11849186718bc18a1185218df09187f18720d18d618d81849185718a4182e18d61857188618ee9820186c18730a188c182518251844185a18cd188e18fe18cb188d18ae1865184918dc186418ce187818ef183c18501863181e18e018da18d918ab188f18761818f699010418a41859184c185918290b18fc18e7188318bf183d187018d118911855183f1840184218bd184d18aa081818187618d6188418221873183718cf05185f18de18e61852187c182718a6183d18d31849187118bc0a1856186b18721890186f1898182718b71718ae18d518de1885183f1877182f18421869181918211836187e185c18180e18e018ec18cd18d918dc185818631859189118eb18f818f2183418371829182518eb186d187d1870188e185218e518ae01185308184318e218af184d1822181e1890188018df18a618c018ed18ca1840185e18ec18e018a618f218b2188418a318af187218fe186613183018591418a8186c1826189f081503182218de186018b4185718d418e518a018c11894186a1818186f186c18880f184e10183318de18e8183c185918cb1835182d18d81018db183518e71818182518721018c01855187a0d18da18b818a218a3174c98184818a118c41518b1186b182518ec09021845184a0c183118c61867189918b118cb14181f183d18be1868186318ce185918a718b118e218e1185018421850185b18bf18880818cc183d189418ac1847186618b218c91618ab18ab18b818730f0b18ce189f18ac1865184018a918fb18e5189818f10e18d9184718b018ff0f189e16182a18de187e183d18c602187a1418a9182f18a118bb68202a9549697a3d472d0238a04a2a2d9679cd1c530a6d14410ba55ee1bcef0edee5ac21c12a9549697a3d472d0238a04a2a2d9679cd1c530a6d14410ba55ee1bcef0edee500000000"];

/*
LOG

🚀 Sending to prover API...
api-client.js:20 🚀 Sending payload to prover API...
2bitcoin-api-service.js:80 Optimizing interval to 16000ms after 3 successes
2bitcoin-api-service.js:80 Optimizing interval to 15000ms after 4 successes
api-client.js:33 📥 Prover response meta: {status: 200, ok: true, contentType: 'application/json', bodyLength: 2267}bodyLength: 2267contentType: "application/json"ok: truestatus: 200[[Prototype]]: Object
payload-validator.js:171 🔍 Validating prover response...
payload-validator.js:194 ✅ Prover response validation passed: 2 transactions
api-client.js:56 ✅ Prover API request successful
minting-step-executor.js:94 ⏱️ Prover response: 183.0s
payload-validator.js:171 🔍 Validating prover response...
payload-validator.js:194 ✅ Prover response validation passed: 2 transactions
minting-step-executor.js:97 ✅ Prover API successful
minting-data-validator.js:168 ✅ Prover response validated successfully
minting-step-executor.js:108 🔐 Signing transactions...
transaction-signer-service.js:127 🔐 Signing 2 prover transactions...
transaction-signer-service.js:133 🔐 Signing transaction 1/2
transaction-signer-service.js:168 [ScureSigner] Converting transaction to PSBT format...
transaction-signer-service.js:206 [ScureSigner] ✅ Transaction converted to PSBT
transaction-signer-service.js:54 [ScureSigner] Starting PSBT signing...
transaction-signer-service.js:55 [ScureSigner] Using derivation path: m/86'/0'/0'
transaction-signer-service.js:62 [ScureSigner] PSBT parsed successfully
transaction-signer-service.js:120 [ScureSigner] Error signing PSBT: TypeError: invalid mnemonic type: undefined
    at nfkd (@scure_bip39.js?v=847ecd10:90:11)
    at normalize (@scure_bip39.js?v=847ecd10:94:16)
    at mnemonicToSeed (@scure_bip39.js?v=847ecd10:143:30)
    at ScureBitcoinTransactionSigner.deriveTapKeys (transaction-signer-service.js:19:28)
    at async ScureBitcoinTransactionSigner.signPSBT (transaction-signer-service.js:66:42)
    at async ScureBitcoinTransactionSigner.signProverTransactions (transaction-signer-service.js:140:38)
    at async MintingStepExecutor.executeStep5_signTransactions (minting-step-executor.js:111:40)
    at async MintingManager.executeAllSteps (minting-manager.js:127:35)
    at async MintingManager.executeMintingProcess (minting-manager.js:70:13)
    at async HTMLButtonElement.<anonymous> (app-controller.js:150:21)
overrideMethod @ hook.js:608
signPSBT @ transaction-signer-service.js:120
await in signPSBT
signProverTransactions @ transaction-signer-service.js:140
await in signProverTransactions
executeStep5_signTransactions @ minting-step-executor.js:111
executeAllSteps @ minting-manager.js:127
await in executeAllSteps
executeMintingProcess @ minting-manager.js:70
(anonymous) @ app-controller.js:150Understand this error
transaction-signer-service.js:156 ❌ Error signing transaction 1: Error: Failed to sign PSBT: invalid mnemonic type: undefined
    at ScureBitcoinTransactionSigner.signPSBT (transaction-signer-service.js:121:19)
    at async ScureBitcoinTransactionSigner.signProverTransactions (transaction-signer-service.js:140:38)
    at async MintingStepExecutor.executeStep5_signTransactions (minting-step-executor.js:111:40)
    at async MintingManager.executeAllSteps (minting-manager.js:127:35)
    at async MintingManager.executeMintingProcess (minting-manager.js:70:13)
    at async HTMLButtonElement.<anonymous> (app-controller.js:150:21)
overrideMethod @ hook.js:608
signProverTransactions @ transaction-signer-service.js:156
await in signProverTransactions
executeStep5_signTransactions @ minting-step-executor.js:111
executeAllSteps @ minting-manager.js:127
await in executeAllSteps
executeMintingProcess @ minting-manager.js:70
(anonymous) @ app-controller.js:150Understand this error
minting-manager.js:80 ❌ Minting process failed: Error: Transaction signing failed: Failed to sign transaction 1: Failed to sign PSBT: invalid mnemonic type: undefined
    at MintingStepExecutor.executeStep5_signTransactions (minting-step-executor.js:122:19)
    at async MintingManager.executeAllSteps (minting-manager.js:127:35)
    at async MintingManager.executeMintingProcess (minting-manager.js:70:13)
    at async HTMLButtonElement.<anonymous> (app-controller.js:150:21)
overrideMethod @ hook.js:608
executeMintingProcess @ minting-manager.js:80
await in executeMintingProcess
(anonymous) @ app-controller.js:150Understand this error
*/