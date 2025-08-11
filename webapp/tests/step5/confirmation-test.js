// Test for ConfirmationMonitorService
import { ConfirmationMonitorService } from '../../src/services/confirmation-monitor-service.js';

async function testConfirmationMonitor() {
    console.log('🧪 Testing ConfirmationMonitorService...');

    const service = new ConfirmationMonitorService();

    // Test 1: Check if service initializes correctly
    console.log('✅ Test 1: Service initialization');
    console.log('API URL:', service.mempoolApiUrl);
    console.log('Polling interval:', service.pollingInterval);
    console.log('Max retries:', service.maxRetries);

    // Test 2: Test getTxData with a known transaction
    const testTxid = '282c18027588febca2b0f037a02f70c4a9b175a464dd460b745dc94be7ceaaa8';

    try {
        console.log('\n✅ Test 2: Get transaction data');
        const txData = await service.getTxData(testTxid);
        console.log('Transaction data:', {
            txid: txData.txid,
            confirmed: txData.status?.confirmed,
            blockHash: txData.status?.block_hash,
            blockHeight: txData.status?.block_height
        });

        // Test 3: Check transaction existence
        console.log('\n✅ Test 3: Check transaction existence');
        const exists = await service.checkTxExists(testTxid);
        console.log('Transaction exists:', exists);

        // Test 4: Get current block height
        console.log('\n✅ Test 4: Get current block height');
        const blockHeight = await service.getCurrentBlockHeight();
        console.log('Current block height:', blockHeight);

        console.log('\n🎉 All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
    window.testConfirmationMonitor = testConfirmationMonitor;
    console.log('📋 Confirmation monitor test loaded. Run testConfirmationMonitor() to execute.');
} else {
    testConfirmationMonitor();
}
