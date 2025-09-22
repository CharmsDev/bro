export class WebGPUMiner {
    constructor() {
        this.device = null;
        this.queue = null;
        this.adapter = null;
        this.pipeline = null;
        this.supported = typeof navigator !== 'undefined' && 'gpu' in navigator;
        this.block0Buffer = null;
        this.tailBuffer = null;
        this.challengeLen = 0;
        this.tailLen = 0;
        this.workgroupSize = 256;
    }

    isSupported() {
        return this.supported;
    }

    async init() {
        if (!this.isSupported()) throw new Error('WebGPU not supported');
        if (this.device) return;

        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) throw new Error('Failed to get WebGPU adapter');

        this.device = await this.adapter.requestDevice();
        this.queue = this.device.queue;

        const shaderCode = `// Double SHA-256 of (challenge prefix + decimal nonce ASCII) with per-dispatch best reduction, emulated u64 nonce via two u32
struct Params { startLo: u32, startHi: u32, count: u32, challengeLen: u32, tailLen: u32, _pad: u32 };
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> block0Words: array<u32>; // 16 u32 words (first 64 bytes of challenge)
@group(0) @binding(2) var<storage, read> tailBytes: array<u32>;  // each entry is a byte (0..255) as u32, length=tailLen
@group(0) @binding(3) var<storage, read_write> bestDigest: array<u32>; // 8 u32 words
struct BestInfo { bestLz: atomic<u32>, bestNonceLo: atomic<u32>, bestNonceHi: atomic<u32>, bestLock: atomic<u32> };
@group(0) @binding(4) var<storage, read_write> bestInfo: BestInfo;

fn rotr(x: u32, n: u32) -> u32 { return (x >> n) | (x << (32u - n)); }
// 64-bit helpers (two u32 words, lo and hi)
fn u64_add_u32(lo: u32, hi: u32, add: u32) -> vec2<u32> {
  let nlo = lo + add;
  let carry = select(0u, 1u, nlo < lo);
  let nhi = hi + carry;
  return vec2<u32>(nlo, nhi);
}

fn u64_divmod10(lo: u32, hi: u32) -> vec3<u32> {
  // Long division in base 2^16 to avoid overflow
  let q_hi = hi / 10u;
  let r_hi = hi - q_hi * 10u; // 0..9
  // First stage: divide (r_hi<<16 | lo_hi16) by 10
  let lo_hi16 = (lo >> 16u) & 0xFFFFu;
  let x1 = (r_hi << 16u) | lo_hi16; // <= 9*65536 + 65535 = 655359
  let q1 = x1 / 10u;
  let r1 = x1 - q1 * 10u; // 0..9
  // Second stage: divide (r1<<16 | lo_lo16) by 10
  let lo_lo16 = lo & 0xFFFFu;
  let x2 = (r1 << 16u) | lo_lo16;
  let q2 = x2 / 10u;
  let r2 = x2 - q2 * 10u; // remainder 0..9
  let q_lo = (q1 << 16u) | q2;
  return vec3<u32>(q_lo, q_hi, r2);
}

fn ch(x: u32, y: u32, z: u32) -> u32 { return (x & y) ^ ((~x) & z); }
fn maj(x: u32, y: u32, z: u32) -> u32 { return (x & y) ^ (x & z) ^ (y & z); }
fn bigSigma0(x: u32) -> u32 { return rotr(x, 2u) ^ rotr(x, 13u) ^ rotr(x, 22u); }
fn bigSigma1(x: u32) -> u32 { return rotr(x, 6u) ^ rotr(x, 11u) ^ rotr(x, 25u); }
fn smallSigma0(x: u32) -> u32 { return rotr(x, 7u) ^ rotr(x, 18u) ^ (x >> 3u); }
fn smallSigma1(x: u32) -> u32 { return rotr(x, 17u) ^ rotr(x, 19u) ^ (x >> 10u); }

fn sha256_compress(w0_15: array<u32, 16>, h_in: array<u32, 8>) -> array<u32, 8> {
  var w = array<u32, 64>();
  for (var i0: u32 = 0u; i0 < 16u; i0 = i0 + 1u) { w[i0] = w0_15[i0]; }
  let K: array<u32, 64> = array<u32, 64>(
    0x428a2f98u, 0x71374491u, 0xb5c0fbcfu, 0xe9b5dba5u, 0x3956c25bu, 0x59f111f1u, 0x923f82a4u, 0xab1c5ed5u,
    0xd807aa98u, 0x12835b01u, 0x243185beu, 0x550c7dc3u, 0x72be5d74u, 0x80deb1feu, 0x9bdc06a7u, 0xc19bf174u,
    0xe49b69c1u, 0xefbe4786u, 0x0fc19dc6u, 0x240ca1ccu, 0x2de92c6fu, 0x4a7484aau, 0x5cb0a9dcu, 0x76f988dau,
    0x983e5152u, 0xa831c66du, 0xb00327c8u, 0xbf597fc7u, 0xc6e00bf3u, 0xd5a79147u, 0x06ca6351u, 0x14292967u,
    0x27b70a85u, 0x2e1b2138u, 0x4d2c6dfcu, 0x53380d13u, 0x650a7354u, 0x766a0abbu, 0x81c2c92eu, 0x92722c85u,
    0xa2bfe8a1u, 0xa81a664bu, 0xc24b8b70u, 0xc76c51a3u, 0xd192e819u, 0xd6990624u, 0xf40e3585u, 0x106aa070u,
    0x19a4c116u, 0x1e376c08u, 0x2748774cu, 0x34b0bcb5u, 0x391c0cb3u, 0x4ed8aa4au, 0x5b9cca4fu, 0x682e6ff3u,
    0x748f82eeu, 0x78a5636fu, 0x84c87814u, 0x8cc70208u, 0x90befffau, 0xa4506cebu, 0xbef9a3f7u, 0xc67178f2u
  );

  var a = h_in[0]; var b = h_in[1]; var c = h_in[2]; var d = h_in[3];
  var e = h_in[4]; var f = h_in[5]; var g = h_in[6]; var hh = h_in[7];

  for (var t: u32 = 16u; t < 64u; t = t + 1u) {
    w[t] = smallSigma1(w[t - 2u]) + w[t - 7u] + smallSigma0(w[t - 15u]) + w[t - 16u];
  }

  for (var t2: u32 = 0u; t2 < 64u; t2 = t2 + 1u) {
    let T1 = hh + bigSigma1(e) + ch(e, f, g) + K[t2] + w[t2];
    let T2 = bigSigma0(a) + maj(a, b, c);
    hh = g; g = f; f = e; e = d + T1; d = c; c = b; b = a; a = T1 + T2;
  }

  let o0 = h_in[0] + a; let o1 = h_in[1] + b; let o2 = h_in[2] + c; let o3 = h_in[3] + d;
  let o4 = h_in[4] + e; let o5 = h_in[5] + f; let o6 = h_in[6] + g; let o7 = h_in[7] + hh;
  return array<u32,8>(o0, o1, o2, o3, o4, o5, o6, o7);
}

fn sha256_block(w0_15: array<u32,16>) -> array<u32,8> {
  // Initialize state (IV)
  var h = array<u32,8>(
    0x6a09e667u, 0xbb67ae85u, 0x3c6ef372u, 0xa54ff53au,
    0x510e527fu, 0x9b05688cu, 0x1f83d9abu, 0x5be0cd19u);

  var w = array<u32,64>();
  for (var i: u32 = 0u; i < 16u; i = i + 1u) { w[i] = w0_15[i]; }
  return sha256_compress(w0_15, h);
}

fn construct_block_from_nonce(nonce: u32) -> array<u32,16> {
  // Message is 4 bytes (nonce LE), then 0x80, then zeros, then 32-bit zero hi + 32-bit bit length (32) at end
  var w = array<u32,16>();
  // Pack nonce little-endian into a u32 then convert to big-endian word for SHA-256
  let b0: u32 = (nonce & 0x000000FFu) << 24u;
  let b1: u32 = (nonce & 0x0000FF00u) << 8u;
  let b2: u32 = (nonce & 0x00FF0000u) >> 8u;
  let b3: u32 = (nonce & 0xFF000000u) >> 24u;
  w[0] = b0 | b1 | b2 | b3;
  w[1] = 0x80000000u; // 0x80 then zeros
  for (var i: u32 = 2u; i < 15u; i = i + 1u) { w[i] = 0u; }
  w[15] = 32u; // bit length = 4 bytes * 8
  return w;
}

fn sha256_single_block_nonce(nonce: u32) -> array<u32,8> {
  let w = construct_block_from_nonce(nonce);
  return sha256_block(w);
}

fn sha256_of_digest(digest: array<u32,8>) -> array<u32,8> {
  // Build a 32-byte message from digest words (already big-endian words), then padding to single block
  var w = array<u32,16>();
  for (var i: u32 = 0u; i < 8u; i = i + 1u) { w[i] = digest[i]; }
  w[8] = 0x80000000u;
  for (var j: u32 = 9u; j < 15u; j = j + 1u) { w[j] = 0u; }
  w[15] = 256u; // 32 bytes * 8
  return sha256_block(w);
}

// helper functions removed; inline decimal conversion used below

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= params.count) { return; }
  var n = u64_add_u32(params.startLo, params.startHi, idx);
  var nonce_lo = n.x; // u32
  var nonce_hi = n.y; // u32

  // 1) Pre-compress first 64 bytes of challenge
  var w0 = array<u32,16>();
  for (var i: u32 = 0u; i < 16u; i = i + 1u) { w0[i] = block0Words[i]; }
  var state = sha256_block(w0);

  // 2) Build second block bytes: tail + nonce_ascii + 0x80 + pad ... + totalLen(64-bit)
  var bytes = array<u32,64>();
  let challengeLen = params.challengeLen; // total challenge length in bytes
  let tailLen = params.tailLen;
  for (var i2: u32 = 0u; i2 < tailLen; i2 = i2 + 1u) {
    bytes[i2] = tailBytes[i2] & 0xFFu;
  }
  var off: u32 = tailLen;
  // convert nonce to decimal ASCII at bytes[off..]
  var digits = array<u32,10>();
  var len_d: u32 = 0u;
  if (nonce_hi == 0u && nonce_lo == 0u) {
    bytes[off] = 48u; // '0'
    len_d = 1u;
  } else {
    var q_lo = nonce_lo;
    var q_hi = nonce_hi;
    loop {
      let dm = u64_divmod10(q_lo, q_hi);
      q_lo = dm.x; q_hi = dm.y;
      let rem = dm.z; // 0..9
      digits[len_d] = 48u + rem;
      len_d = len_d + 1u;
      if (q_lo == 0u && q_hi == 0u) { break; }
    }
    for (var i4: u32 = 0u; i4 < len_d; i4 = i4 + 1u) {
      bytes[off + i4] = digits[len_d - 1u - i4];
    }
  }
  let nonceLen = len_d;
  off = off + nonceLen;
  // append 0x80
  bytes[off] = 0x80u; off = off + 1u;
  // pad zeros until last 8 bytes (we only use low 32 bits of length here)
  // total message length in bytes:
  let totalLenBytes = challengeLen + nonceLen;
  let totalBitLenLow = totalLenBytes * 8u;
  // we place zeros so that byte index 56..59 are high bits (0), 60..63 are low bits
  for (var i3: u32 = off; i3 < 56u; i3 = i3 + 1u) { bytes[i3] = 0u; }
  bytes[56u] = 0u; bytes[57u] = 0u; bytes[58u] = 0u; bytes[59u] = 0u;
  bytes[60u] = (totalBitLenLow >> 24u) & 0xFFu;
  bytes[61u] = (totalBitLenLow >> 16u) & 0xFFu;
  bytes[62u] = (totalBitLenLow >> 8u) & 0xFFu;
  bytes[63u] = totalBitLenLow & 0xFFu;

  // pack bytes into words
  var w1 = array<u32,16>();
  for (var wi: u32 = 0u; wi < 16u; wi = wi + 1u) {
    let b0 = bytes[wi*4u + 0u];
    let b1 = bytes[wi*4u + 1u];
    let b2 = bytes[wi*4u + 2u];
    let b3 = bytes[wi*4u + 3u];
    w1[wi] = (b0 << 24u) | (b1 << 16u) | (b2 << 8u) | b3;
  }

  // compress second block with state from first block
  var h = state;
  h = sha256_compress(w1, h);

  // double SHA-256
  let second = sha256_of_digest(h);
  // count leading zero bits without building hex
  var lz: u32 = 0u;
  for (var k: u32 = 0u; k < 8u; k = k + 1u) {
    let c = countLeadingZeros(second[k]);
    lz = lz + c;
    if (c != 32u) { break; }
  }

  // Update global best using atomicMax on leading zeros
  let prev = atomicMax(&bestInfo.bestLz, lz);

  if (lz > prev) {
    var prevLock: u32;
    var bestLz: u32;

    loop {
      prevLock = atomicAdd(&bestInfo.bestLock, 1u);

      bestLz = atomicLoad(&bestInfo.bestLz);
      if (prevLock == 0u || bestLz > lz) { break; }

      _ = atomicSub(&bestInfo.bestLock, 1u);
    }

    if (bestLz == lz) {
      for (var i: u32 = 0u; i < 8u; i = i + 1u) {
        bestDigest[i] = second[i];
      }
      atomicStore(&bestInfo.bestNonceLo, nonce_lo);
      atomicStore(&bestInfo.bestNonceHi, nonce_hi);
    }

    _ = atomicSub(&bestInfo.bestLock, 1u);
  }
}`;

        const module = this.device.createShaderModule({code: shaderCode});
        this.pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {module, entryPoint: 'main'}
        });
    }

    setChallenge(challengeBytes) {
        this.challengeLen = challengeBytes.length >>> 0;
        const first = new Uint8Array(64);
        first.set(challengeBytes.subarray(0, Math.min(64, challengeBytes.length)));
        const tail = challengeBytes.length > 64 ? challengeBytes.subarray(64) : new Uint8Array(0);
        this.tailLen = tail.length >>> 0;

        // pack first 64 bytes into 16 BE words
        const block0 = new Uint32Array(16);
        for (let i = 0; i < 16; i++) {
            const b0 = first[i * 4 + 0] || 0;
            const b1 = first[i * 4 + 1] || 0;
            const b2 = first[i * 4 + 2] || 0;
            const b3 = first[i * 4 + 3] || 0;
            block0[i] = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
        }

        // tail bytes as u32 per byte
        const tailU32 = new Uint32Array(this.tailLen);
        for (let i = 0; i < this.tailLen; i++) tailU32[i] = tail[i];

        // create/update buffers
        if (this.block0Buffer) this.block0Buffer.destroy?.();
        if (this.tailBuffer) this.tailBuffer.destroy?.();
        this.block0Buffer = this.device.createBuffer({
            size: block0.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.queue.writeBuffer(this.block0Buffer, 0, block0.buffer);
        this.tailBuffer = this.device.createBuffer({
            size: Math.max(1, tailU32.byteLength),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        if (tailU32.byteLength > 0) this.queue.writeBuffer(this.tailBuffer, 0, tailU32.buffer);
    }

    setStartNonceForBatch(startNonceBigInt) {
        const lo = Number(startNonceBigInt & 0xFFFFFFFFn) >>> 0;
        const hi = Number((startNonceBigInt >> 32n) & 0xFFFFFFFFn) >>> 0;
        const tmp = new Uint32Array([lo, hi]);
        // write directly into uniform once it's created each batch
        this._startLo = lo;
        this._startHi = hi;
    }

    async computeBatch(startNonce, count) {
        if (!this.device) await this.init();

        const wordsPerHash = 8;
        const bestDigestBuffer = this.device.createBuffer({
            size: wordsPerHash * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        const bestInfoBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });

        // startLo/startHi will be filled in by caller via setStartNonceForBatch
        const uniformData = new Uint32Array([0, 0, count >>> 0, this.challengeLen >>> 0, this.tailLen >>> 0, 0]);
        const uniformBuffer = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        // inject start nonce lo/hi for this batch
        uniformData[0] = (this._startLo ?? 0) >>> 0;
        uniformData[1] = (this._startHi ?? 0) >>> 0;
        this.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer);

        // reset best info (lz, lo, hi)
        const zeroInfo = new Uint32Array([0, 0, 0, 0]);
        this.queue.writeBuffer(bestInfoBuffer, 0, zeroInfo.buffer);

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {binding: 0, resource: {buffer: uniformBuffer}},
                {binding: 1, resource: {buffer: this.block0Buffer}},
                {binding: 2, resource: {buffer: this.tailBuffer}},
                {binding: 3, resource: {buffer: bestDigestBuffer}},
                {binding: 4, resource: {buffer: bestInfoBuffer}}
            ]
        });

        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        const workgroupSize = 256;
        const numGroups = Math.ceil(count / workgroupSize);
        pass.dispatchWorkgroups(numGroups);
        pass.end();

        const readDigest = this.device.createBuffer({
            size: wordsPerHash * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const readInfo = this.device.createBuffer({
            size: 12,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        commandEncoder.copyBufferToBuffer(bestDigestBuffer, 0, readDigest, 0, wordsPerHash * 4);
        commandEncoder.copyBufferToBuffer(bestInfoBuffer, 0, readInfo, 0, 12);
        this.queue.submit([commandEncoder.finish()]);

        await readDigest.mapAsync(GPUMapMode.READ);
        const bestWords = new Uint32Array(readDigest.getMappedRange()).slice();
        readDigest.unmap();
        await readInfo.mapAsync(GPUMapMode.READ);
        const infoArr = new Uint32Array(readInfo.getMappedRange()).slice();
        readInfo.unmap();

        uniformBuffer.destroy();
        bestDigestBuffer.destroy();
        bestInfoBuffer.destroy();

        const bestNonceLo = infoArr[1] >>> 0;
        const bestNonceHi = infoArr[2] >>> 0;
        return {bestWords, bestLeadingZeros: infoArr[0] >>> 0, bestNonceLo, bestNonceHi};
    }

    getRecommendedBatchSize() {
        try {
            const limits = this.device.limits || {};
            const maxGroups = limits.maxComputeWorkgroupsPerDimension ?? 65535;
            return this.workgroupSize * maxGroups;
        } catch (_) {
            // Sensible default
            return 256 * 256; // 65,536
        }
    }
}

window.WebGPUMiner = WebGPUMiner;


