/**
 * Prover API client for BRO token minting
 */
export class ProverClient {
    constructor(baseUrl = 'https://v7.charms.dev/spells/prove') {
        this.baseUrl = baseUrl;
    }

    async prove(payload) {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Prover API error ${response.status}: ${text}`);
        }

        return await response.json();
    }
}
