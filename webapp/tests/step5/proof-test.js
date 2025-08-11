// Test for TxProofService
import { TxProofService } from '../../src/services/tx-proof-service.js';

async function testTxProofService() {
    console.log('🧪 Testing TxProofService...');

    const service = new TxProofService();

    // Test 1: Service initialization
    console.log('✅ Test 1: Service initialization');
    console.log('API URL:', service.mempoolApiUrl);

    // Test 2: Get block data
    console.log('\n✅ Test 2: Get block data');
    const testBlockHash = '000000000000000000000000000000000000000000000000000000000000000a';

    try {
        // This will likely fail with a real block hash, but tests the structure
        const blockData = await service.getBlockData(testBlockHash);
        console.log('Block data structure:', {
            hasTransactions: Array.isArray(blockData.tx),
            txCount: blockData.tx?.length || 0,
            height: blockData.height
        });
    } catch (error) {
        console.log('Expected error for test block hash:', error.message);
    }

    // Test 3: Calculate merkle root
    console.log('\n✅ Test 3: Calculate merkle root');
    const testTxids = [
        'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
        'c3d4e5f6789012345678901234567890123456789012345678901234567890a1b2',
        'd4e5f6789012345678901234567890123456789012345678901234567890a1b2c3'
    ];

    try {
        const merkleRoot = service.calculateMerkleRoot(testTxids);
        console.log('Calculated merkle root:', merkleRoot);
        console.log('Root length:', merkleRoot.length);
    } catch (error) {
        console.error('❌ Merkle root calculation failed:', error.message);
    }

    // Test 4: Generate merkle proof
    console.log('\n✅ Test 4: Generate merkle proof');
    const targetTxid = testTxids[1]; // Second transaction

    try {
        const proof = service.generateMerkleProof(testTxids, targetTxid);
        console.log('Generated proof:', {
            targetTxid: proof.targetTxid,
            proofLength: proof.proof.length,
            merkleRoot: proof.merkleRoot,
            isValid: proof.isValid
        });

        // Test 5: Verify the proof
        console.log('\n✅ Test 5: Verify merkle proof');
        const isValid = service.verifyMerkleProof(proof.targetTxid, proof.proof, proof.merkleRoot);
        console.log('Proof verification result:', isValid);

    } catch (error) {
        console.error('❌ Merkle proof generation failed:', error.message);
    }

    // Test 6: Format proof for API
    console.log('\n✅ Test 6: Format proof for API');
    const mockProofData = {
        targetTxid: testTxids[0],
        proof: ['hash1', 'hash2', 'hash3'],
        merkleRoot: 'root_hash',
        isValid: true
    };

    try {
        const formattedProof = service.formatProofForAPI(mockProofData);
        console.log('Formatted proof:', formattedProof);
        console.log('Proof string length:', formattedProof.length);
    } catch (error) {
        console.error('❌ Proof formatting failed:', error.message);
    }

    // Test 7: Hash functions
    console.log('\n✅ Test 7: Hash functions');
    const testData = 'hello world';

    try {
        const sha256Hash = service.sha256(testData);
        console.log('SHA256 hash:', sha256Hash);

        const doubleSha256 = service.doubleSha256(testData);
        console.log('Double SHA256 hash:', doubleSha256);

        // Test with hex input
        const hexInput = '48656c6c6f20576f726c64'; // "Hello World" in hex
        const hashFromHex = service.sha256FromHex(hexInput);
        console.log('Hash from hex:', hashFromHex);

    } catch (error) {
        console.error('❌ Hash function test failed:', error.message);
    }

    console.log('\n🎉 TxProofService tests completed!');
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
    window.testTxProofService = testTxProofService;
    console.log('📋 TxProofService test loaded. Run testTxProofService() to execute.');
} else {
    testTxProofService();
}
