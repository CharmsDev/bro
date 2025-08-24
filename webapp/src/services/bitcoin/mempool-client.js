 import environmentConfig from '../../config/environment.js';

/**
 * MempoolClient - thin wrapper over mempool.space REST API
 * Network-aware via environmentConfig.getMempoolApiBase()
 */
export class MempoolClient {
  constructor(baseUrl = environmentConfig.getMempoolApiBase()) {
    this.baseUrl = baseUrl;
    // Default client-level settings for network resiliency (configurable)
    this.defaultTimeoutMs = environmentConfig.getHttpTimeoutMs?.() ?? 10000; // 10s
    this.defaultRetries = environmentConfig.getHttpRetries?.() ?? 2;         // total attempts = retries + 1
    this.baseBackoffMs = environmentConfig.getHttpBackoffBaseMs?.() ?? 500;  // exponential backoff base
    // Lightweight in-memory cache
    this._cache = new Map(); // key -> { ts, value }
    this._cacheTtl = environmentConfig.getCacheTtl?.() ?? { txMs: 3000, utxosMs: 5000, blocksMs: 3000 };
  }

  /**
   * Internal helper: fetch with timeout, retries, and exponential backoff.
   * Retries on network errors, 429, and 5xx. Respects Retry-After header if present (seconds).
   */
  async _fetchWithRetry(url, fetchOptions = {}, {
    timeoutMs = this.defaultTimeoutMs,
    retries = this.defaultRetries,
    backoffBaseMs = this.baseBackoffMs,
  } = {}) {
    let attempt = 0;
    let lastError;

    while (attempt <= retries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
        clearTimeout(timeoutId);

        // If successful response, return immediately
        if (res.ok) return res;

        // Retry on 429 and 5xx
        if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
          // Calculate next delay
          let delayMs = this._computeBackoffDelay(attempt, backoffBaseMs);
          // Honor Retry-After header if present (seconds)
          const retryAfter = res.headers.get('Retry-After');
          if (retryAfter && !Number.isNaN(Number(retryAfter))) {
            delayMs = Math.max(delayMs, Number(retryAfter) * 1000);
          }

          if (attempt < retries) {
            await this._sleep(delayMs);
            attempt++;
            continue;
          }
        }

        // Non-retriable or out of retries
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        // Retry on abort (timeout) or network errors
        if (attempt < retries && (err.name === 'AbortError' || err?.message)) {
          const delayMs = this._computeBackoffDelay(attempt, backoffBaseMs);
          await this._sleep(delayMs);
          attempt++;
          continue;
        }
        throw err;
      }
    }

    // Should not reach here; throw last error if exists
    if (lastError) throw lastError;
    throw new Error('Network request failed without specific error');
  }

  _computeBackoffDelay(attempt, baseMs) {
    // Exponential backoff with jitter
    const exp = Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 + 0.85; // 0.85x - 1.15x
    return Math.floor(baseMs * exp * jitter);
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _cacheKey(path) {
    return `${this.baseUrl}${path}`;
  }

  _getCached(path, ttlMs) {
    if (!ttlMs || ttlMs <= 0) return undefined;
    const key = this._cacheKey(path);
    const item = this._cache.get(key);
    if (!item) return undefined;
    if (Date.now() - item.ts > ttlMs) {
      this._cache.delete(key);
      return undefined;
    }
    return item.value;
  }

  _setCached(path, value) {
    const key = this._cacheKey(path);
    this._cache.set(key, { ts: Date.now(), value });
  }

  // Address endpoints
  async getAddressInfo(address, options = {}) {
    const res = await this._fetchWithRetry(`${this.baseUrl}/address/${address}`, options);
    if (!res.ok) throw new Error(`Failed to fetch address info: ${res.status}`);
    return res.json();
  }

  async getAddressUtxos(address, options = {}) {
    const path = `/address/${address}/utxo`;
    const cached = this._getCached(path, this._cacheTtl.utxosMs);
    if (cached !== undefined) return cached;

    const res = await this._fetchWithRetry(`${this.baseUrl}${path}`, options);
    if (!res.ok) throw new Error(`Failed to fetch address utxos: ${res.status}`);
    const data = await res.json();
    this._setCached(path, data);
    return data;
  }

  async getTx(txid, options = {}) {
    const path = `/tx/${txid}`;
    const cached = this._getCached(path, this._cacheTtl.txMs);
    if (cached !== undefined) return cached;

    const res = await this._fetchWithRetry(`${this.baseUrl}${path}`, options);
    if (res.status === 404) {
      // Cache null briefly to avoid tight loops hammering the API
      this._setCached(path, null);
      return null;
    }
    if (!res.ok) throw new Error(`Failed to fetch transaction data: ${res.status}`);
    const data = await res.json();
    this._setCached(path, data);
    return data;
  }

  async getMerkleProof(txid, options = {}) {
    const res = await this._fetchWithRetry(`${this.baseUrl}/tx/${txid}/merkleblock-proof`, options);
    if (!res.ok) throw new Error(`Failed to fetch merkleblock proof: ${res.status}`);
    return res.text();
  }

  async getBlocks(count = 10, options = {}) {
    const path = `/blocks`;
    const cached = this._getCached(path, this._cacheTtl.blocksMs);
    if (cached !== undefined) return cached.slice(0, count);

    const res = await this._fetchWithRetry(`${this.baseUrl}${path}`, options);
    if (!res.ok) throw new Error(`Failed to fetch blocks: ${res.status}`);
    const blocks = await res.json();
    this._setCached(path, blocks);
    return blocks.slice(0, count);
  }

  async getBlockTxids(blockHash, options = {}) {
    const res = await this._fetchWithRetry(`${this.baseUrl}/block/${blockHash}/txids`, options);
    if (!res.ok) throw new Error(`Failed to fetch block transactions: ${res.status}`);
    return res.json();
  }

  async getTipHeight(options = {}) {
    const res = await this._fetchWithRetry(`${this.baseUrl}/blocks/tip/height`, options);
    if (!res.ok) throw new Error(`Failed to fetch block height: ${res.status}`);
    return res.text();
  }
}

export default MempoolClient;
