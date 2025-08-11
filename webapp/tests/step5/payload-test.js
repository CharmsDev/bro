// Test for ProverApiService payload generation
import { ProverApiService } from '../../src/services/prover-api-service.js';

async function testPayloadGeneration() {
    console.log('🧪 Testing ProverApiService payload generation...');

    const service = new ProverApiService();

    // Test 1: Service initialization
    console.log('✅ Test 1: Service initialization');
    console.log('API URL:', service.apiUrl);
    console.log('WASM Path:', service.wasmPath);
    console.log('WASM Hash:', service.wasmHash);

    // Test 2: Generate app_id from UTXO
    console.log('\n✅ Test 2: Generate app_id');
    const testUtxo = '4cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c:1';
    try {
        const appId = await service.generateAppId(testUtxo);
        console.log('Generated app_id:', appId);
        console.log('App_id length:', appId.length);
    } catch (error) {
        console.error('❌ App_id generation failed:', error.message);
    }

    // Test 3: Calculate mined amount
    console.log('\n✅ Test 3: Calculate mined amount');
    const difficulty = 1000;
    const baseReward = 112.5;
    const minedAmount = service.calculateMinedAmount(difficulty, baseReward);
    console.log('Mined amount:', minedAmount);
    console.log('In BRO tokens:', minedAmount / 100000000);

    // Test 4: Mock payload generation (without WASM loading)
    console.log('\n✅ Test 4: Mock payload structure');
    const mockMiningData = {
        txid: '282c18027588febca2b0f037a02f70c4a9b175a464dd460b745dc94be7ceaaa8',
        txHex: '020000000001014cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c0000000000ffffffff030000000000000000076a0539303737330903000000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb2f9a070000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb01404ec23be6516c36b36658e28bebf89829b0d7dd7909d84b958e5d6c1516d35fd5c7d7e13dbd7e730b0938e4e59482f13e1cb99cb917ff829d914216a80a6cfc8300000000',
        inputTxid: '4cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c',
        inputVout: 1,
        difficulty: 1000,
        reward: 112.5,
        changeAmount: 498223
    };

    const mockProofData = {
        proof: '004014212de3ff3812985e30078bbf148e99eeaf9c74704243a54f5f31c58608000000006d42362098d1482a441ecc786f57572580e588ca15951942ffbfa1100da20c371f7d9868781c03194d42b3aa0b0400000c'
    };

    const mockWalletData = {
        address: 'tb1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqp3mvzv'
    };

    try {
        // Create a mock payload structure without loading WASM
        const mockPayload = {
            "spell": {
                "version": 6,
                "apps": {
                    "$01": `t/mock-app-id/${service.wasmHash}`
                },
                "private_inputs": {
                    "$01": {
                        "tx": mockMiningData.txHex,
                        "tx_block_proof": mockProofData.proof
                    }
                },
                "ins": [
                    {
                        "utxo_id": `${mockMiningData.txid}:1`,
                        "charms": {}
                    }
                ],
                "outs": [
                    {
                        "address": mockWalletData.address,
                        "charms": {
                            "$01": service.calculateMinedAmount(mockMiningData.difficulty, mockMiningData.reward)
                        }
                    }
                ]
            },
            "binaries": {
                [service.wasmHash]: "mock-wasm-base64-data"
            },
            "prev_txs": [
                mockMiningData.txHex
            ],
            "funding_utxo": `${mockMiningData.txid}:2`,
            "funding_utxo_value": mockMiningData.changeAmount,
            "change_address": mockWalletData.address,
            "fee_rate": 1.0,
            "chain": "bitcoin"
        };

        console.log('Mock payload structure created');

        // Test payload validation
        service.validatePayload(mockPayload);
        console.log('✅ Payload validation passed');

        // Test payload info
        const payloadInfo = service.getPayloadInfo(mockPayload);
        console.log('Payload info:', payloadInfo);

    } catch (error) {
        console.error('❌ Payload test failed:', error.message);
    }

    console.log('\n🎉 Payload generation tests completed!');
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
    window.testPayloadGeneration = testPayloadGeneration;
    console.log('📋 Payload generation test loaded. Run testPayloadGeneration() to execute.');
} else {
    testPayloadGeneration();
}
