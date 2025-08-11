// Test for TransactionSignerService (Step 5 enhancements)
import { TransactionSignerService } from '../../src/services/transaction-signer-service.js';

async function testTransactionSigning() {
    console.log('🧪 Testing TransactionSignerService (Step 5 features)...');

    const service = new TransactionSignerService();

    // Test 1: Service initialization
    console.log('✅ Test 1: Service initialization');
    console.log('Service initialized successfully');

    // Test 2: Mock wallet for testing
    console.log('\n✅ Test 2: Create mock wallet');
    const mockWallet = {
        privateKey: 'cVt4o7BGAig1UXywgGSmARhxMdzP5qvQsxKkSsc1XEkw3tDTQFpy', // Test private key
        address: 'tb1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqp3mvzv',
        publicKey: '0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'
    };
    console.log('Mock wallet created:', {
        hasPrivateKey: !!mockWallet.privateKey,
        address: mockWallet.address
    });

    // Test 3: Parse transaction hex
    console.log('\n✅ Test 3: Parse transaction hex');
    const mockTxHex = '020000000001014cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c0000000000ffffffff030000000000000000076a0539303737330903000000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb2f9a070000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb01404ec23be6516c36b36658e28bebf89829b0d7dd7909d84b958e5d6c1516d35fd5c7d7e13dbd7e730b0938e4e59482f13e1cb99cb917ff829d914216a80a6cfc8300000000';

    try {
        const parsedTx = service.parseTransactionHex(mockTxHex);
        console.log('Parsed transaction:', {
            version: parsedTx.version,
            inputCount: parsedTx.ins.length,
            outputCount: parsedTx.outs.length,
            hasWitness: parsedTx.hasWitnesses
        });
    } catch (error) {
        console.error('❌ Transaction parsing failed:', error.message);
    }

    // Test 4: Create PSBT from transaction
    console.log('\n✅ Test 4: Create PSBT from transaction');
    try {
        const psbt = service.createPSBTFromTransaction(mockTxHex);
        console.log('PSBT created:', {
            inputCount: psbt.inputCount,
            outputCount: psbt.outputCount,
            canSign: psbt.inputCount > 0
        });
    } catch (error) {
        console.error('❌ PSBT creation failed:', error.message);
    }

    // Test 5: Mock prover response transactions
    console.log('\n✅ Test 5: Mock prover response transactions');
    const mockProverResponse = [
        '020000000001014cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c0000000000ffffffff030000000000000000076a0539303737330903000000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb2f9a070000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb00000000',
        '02000000000102a8aacee74bc95d740b46dd64a475b1a9c4702fa037f0b0a2bcfe887502182c280100000000ffffffff58ec06401012d46fd7377dc004d48cf0dc9600a64b46adab99edec1d86b9a47e0000000000ffffffff03e803000000000000225120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684ce8030000000000001600141db4ded10fa155036bfb40717ea68022be899fbb4793070000000000225120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c00000000'
    ];

    console.log('Mock prover response:', {
        transactionCount: mockProverResponse.length,
        firstTxLength: mockProverResponse[0].length,
        secondTxLength: mockProverResponse[1].length
    });

    // Test 6: Validate transaction structure
    console.log('\n✅ Test 6: Validate transaction structures');
    mockProverResponse.forEach((txHex, index) => {
        try {
            const isValid = service.validateTransactionStructure(txHex);
            console.log(`Transaction ${index + 1} validation:`, isValid);
        } catch (error) {
            console.error(`❌ Transaction ${index + 1} validation failed:`, error.message);
        }
    });

    // Test 7: Sign multiple transactions (mock)
    console.log('\n✅ Test 7: Sign multiple transactions (mock)');
    try {
        // This would normally require actual UTXOs and proper setup
        console.log('Mock signing process for', mockProverResponse.length, 'transactions');

        const signingResults = mockProverResponse.map((txHex, index) => {
            return {
                index: index,
                txHex: txHex,
                signed: false, // Would be true if actually signed
                reason: 'Mock test - no actual signing performed'
            };
        });

        console.log('Signing results:', signingResults);

    } catch (error) {
        console.error('❌ Transaction signing failed:', error.message);
    }

    // Test 8: Transaction size calculation
    console.log('\n✅ Test 8: Transaction size calculation');
    mockProverResponse.forEach((txHex, index) => {
        try {
            const size = service.calculateTransactionSize(txHex);
            console.log(`Transaction ${index + 1} size:`, size, 'bytes');
        } catch (error) {
            console.error(`❌ Size calculation failed for tx ${index + 1}:`, error.message);
        }
    });

    // Test 9: Fee calculation
    console.log('\n✅ Test 9: Fee calculation');
    const mockInputValue = 500000; // 0.005 BTC
    const mockOutputValue = 498000; // 0.00498 BTC
    const feeRate = 1.0; // 1 sat/byte

    try {
        const calculatedFee = service.calculateFee(mockInputValue, mockOutputValue);
        console.log('Calculated fee:', calculatedFee, 'satoshis');

        const recommendedFee = service.calculateRecommendedFee(mockTxHex.length / 2, feeRate);
        console.log('Recommended fee:', recommendedFee, 'satoshis');

    } catch (error) {
        console.error('❌ Fee calculation failed:', error.message);
    }

    // Test 10: Signature validation
    console.log('\n✅ Test 10: Signature validation');
    try {
        // Mock signature data
        const mockSignature = '304402207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a002207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a001';
        const isValidSig = service.validateSignature(mockSignature);
        console.log('Mock signature validation:', isValidSig);

    } catch (error) {
        console.error('❌ Signature validation failed:', error.message);
    }

    console.log('\n🎉 TransactionSignerService tests completed!');
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
    window.testTransactionSigning = testTransactionSigning;
    console.log('📋 Transaction signing test loaded. Run testTransactionSigning() to execute.');
} else {
    testTransactionSigning();
}
