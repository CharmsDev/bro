import { PayloadGenerator } from './prover/payload-generator.js';
import { ProverApiClient } from './prover/api-client.js';
import { PayloadValidator } from './prover/payload-validator.js';

export class ProverApiService {
    constructor() {
        this.payloadGenerator = new PayloadGenerator();
        this.apiClient = new ProverApiClient();
    }

    // Allow callers to override the prover API URL (used when user provides custom URL)
    setApiUrl(url) {
        this.apiClient.setApiUrl(url);
    }

    async generatePayload(miningData, proofData, walletData) {
        return this.payloadGenerator.generatePayload(miningData, proofData, walletData);
    }

    async sendToProver(payload, onStatus) {
        return this.apiClient.sendToProver(payload, onStatus);
    }

    validateProverResponse(response) {
        return PayloadValidator.validateProverResponse(response);
    }
}
