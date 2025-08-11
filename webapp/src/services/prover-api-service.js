import { PayloadGenerator } from './prover/payload-generator.js';
import { ProverApiClient } from './prover/api-client.js';
import { PayloadValidator } from './prover/payload-validator.js';

export class ProverApiService {
    constructor() {
        this.payloadGenerator = new PayloadGenerator();
        this.apiClient = new ProverApiClient();
    }



    async generatePayload(miningData, proofData, walletData) {
        return this.payloadGenerator.generatePayload(miningData, proofData, walletData);
    }

    async sendToProver(payload) {
        return this.apiClient.sendToProver(payload);
    }

    validateProverResponse(response) {
        return PayloadValidator.validateProverResponse(response);
    }
}
