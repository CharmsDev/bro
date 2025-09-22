export class WebGPUMiner {
  constructor() {
    this.device = null; this.queue = null; this.adapter = null; this.pipeline = null;
    this.supported = typeof navigator !== 'undefined' && 'gpu' in navigator;
    this.challengeBuffer = null; this.challengeLen = 0;
    this.workgroupSize = 512; // bajará a 256 si no se puede
    this._uniformBuffer = null; this._bestDigestBuffer = null; this._bestInfoBuffer = null;
    this._readDigest = null; this._readInfo = null; this._bindGroup = null;
    this._startLo = 0; this._startHi = 0;
  }

  isSupported(){ return this.supported; }

  async init() {
    if (!this.isSupported()) throw new Error('WebGPU not supported');
    if (this.device) return;
    this.adapter = await navigator.gpu.requestAdapter();
    if (!this.adapter) throw new Error('Failed to get WebGPU adapter');
    this.device = await this.adapter.requestDevice();
    this.queue = this.device.queue;

    const maxInv = this.device.limits?.maxComputeInvocationsPerWorkgroup ?? 256;
    this.workgroupSize = Math.min(512, maxInv >= 512 ? 512 : 256);

    const WG = this.workgroupSize;
    const shaderCode = `
struct Params { 
  startLo: u32,
  startHi: u32,
  count: u32,
  challengeLen: u32,
  _pad0: u32,
  _pad1: u32
};
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> challengeBytes: array<u32>;
@group(0) @binding(2) var<storage, read_write> bestDigest: array<u32>;
struct BestInfo { 
  bestLz: atomic<u32>, 
  bestNonceLo: atomic<u32>, 
  bestNonceHi: atomic<u32> 
};
@group(0) @binding(3) var<storage, read_write> bestInfo: BestInfo;

fn rotr(x:u32,n:u32)->u32{ return (x>>n)|(x<<(32u-n)); }
fn u64_add_u32(lo:u32,hi:u32,add:u32)->vec2<u32>{ let nlo=lo+add; let c=select(0u,1u,nlo<lo); return vec2<u32>(nlo,hi+c); }
fn u64_divmod10(lo:u32,hi:u32)->vec3<u32>{
  let qh = hi/10u; let rh = hi - qh*10u;
  let x1 = (rh<<16u) | ((lo>>16u)&0xFFFFu); let q1 = x1/10u; let r1 = x1 - q1*10u;
  let x2 = (r1<<16u) | (lo&0xFFFFu); let q2 = x2/10u; let r2 = x2 - q2*10u;
  return vec3<u32>((q1<<16u)|q2, qh, r2);
}
fn ch(x:u32,y:u32,z:u32)->u32{ return (x&y)^((~x)&z); }
fn maj(x:u32,y:u32,z:u32)->u32{ return (x&y)^(x&z)^(y&z); }
fn S0(x:u32)->u32{ return rotr(x,2u)^rotr(x,13u)^rotr(x,22u); }
fn S1(x:u32)->u32{ return rotr(x,6u)^rotr(x,11u)^rotr(x,25u); }
fn s0(x:u32)->u32{ return rotr(x,7u)^rotr(x,18u)^(x>>3u); }
fn s1(x:u32)->u32{ return rotr(x,17u)^rotr(x,19u)^(x>>10u); }

fn sha256_compress(w0_15: array<u32,16>, h_in: array<u32,8>)->array<u32,8>{
  var w = array<u32,64>();
  for(var i:u32=0u;i<16u;i=i+1u){ w[i]=w0_15[i]; }
  let K = array<u32,64>(
    0x428a2f98u,0x71374491u,0xb5c0fbcfu,0xe9b5dba5u,0x3956c25bu,0x59f111f1u,0x923f82a4u,0xab1c5ed5u,
    0xd807aa98u,0x12835b01u,0x243185beu,0x550c7dc3u,0x72be5d74u,0x80deb1feu,0x9bdc06a7u,0xc19bf174u,
    0xe49b69c1u,0xefbe4786u,0x0fc19dc6u,0x240ca1ccu,0x2de92c6fu,0x4a7484aau,0x5cb0a9dcu,0x76f988dau,
    0x983e5152u,0xa831c66du,0xb00327c8u,0xbf597fc7u,0xc6e00bf3u,0xd5a79147u,0x06ca6351u,0x14292967u,
    0x27b70a85u,0x2e1b2138u,0x4d2c6dfcu,0x53380d13u,0x650a7354u,0x766a0abbu,0x81c2c92eu,0x92722c85u,
    0xa2bfe8a1u,0xa81a664bu,0xc24b8b70u,0xc76c51a3u,0xd192e819u,0xd6990624u,0xf40e3585u,0x106aa070u,
    0x19a4c116u,0x1e376c08u,0x2748774cu,0x34b0bcb5u,0x391c0cb3u,0x4ed8aa4au,0x5b9cca4fu,0x682e6ff3u,
    0x748f82eeu,0x78a5636fu,0x84c87814u,0x8cc70208u,0x90befffau,0xa4506cebu,0xbef9a3f7u,0xc67178f2u);
  var a=h_in[0]; var b=h_in[1]; var c=h_in[2]; var d=h_in[3];
  var e=h_in[4]; var f=h_in[5]; var g=h_in[6]; var hh=h_in[7];
  for(var t:u32=16u;t<64u;t=t+1u){ w[t]=s1(w[t-2u])+w[t-7u]+s0(w[t-15u])+w[t-16u]; }
  for(var t2:u32=0u;t2<64u;t2=t2+1u){
    let T1=hh+S1(e)+ch(e,f,g)+K[t2]+w[t2];
    let T2=S0(a)+maj(a,b,c);
    hh=g; g=f; f=e; e=d+T1; d=c; c=b; b=a; a=T1+T2;
  }
  return array<u32,8>(h_in[0]+a,h_in[1]+b,h_in[2]+c,h_in[3]+d,h_in[4]+e,h_in[5]+f,h_in[6]+g,h_in[7]+hh);
}
fn sha256_block(w0_15: array<u32,16>)->array<u32,8>{
  let h = array<u32,8>(0x6a09e667u,0xbb67ae85u,0x3c6ef372u,0xa54ff53au,0x510e527fu,0x9b05688cu,0x1f83d9abu,0x5be0cd19u);
  return sha256_compress(w0_15,h);
}
fn sha256_of_digest(d: array<u32,8>)->array<u32,8>{
  var w = array<u32,16>();
  for(var i:u32=0u;i<8u;i=i+1u){ w[i]=d[i]; }
  w[8]=0x80000000u; for(var j:u32=9u;j<15u;j=j+1u){ w[j]=0u; } w[15]=256u; return sha256_block(w);
}
fn nonce_to_decimal_bytes(nlo:u32,nhi:u32,out:ptr<function,array<u32,20>>)->u32{
  var digits = array<u32,20>(); var len:u32=0u;
  if(nhi==0u && nlo==0u){ (*out)[0]=48u; return 1u; }
  var ql=nlo; var qh=nhi;
  loop{
    let dm=u64_divmod10(ql,qh); ql=dm.x; qh=dm.y; let r=dm.z;
    digits[len]=48u+r; len=len+1u; if(ql==0u && qh==0u){ break; }
  }
  for(var i:u32=0u;i<len;i=i+1u){ (*out)[i]=digits[len-1u-i]; }
  return len;
}

@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x; if(idx >= params.count){ return; }
  let n = u64_add_u32(params.startLo, params.startHi, idx);
  let nlo = n.x; let nhi = n.y;

  var nonce_ascii = array<u32,20>();
  let nonce_len = nonce_to_decimal_bytes(nlo,nhi,&nonce_ascii);

  let total_len = params.challengeLen + nonce_len;
  var padding_len: u32;
  if ((total_len + 9u) % 64u == 0u) {
    padding_len = 64u;
  } else {
    padding_len = 64u - ((total_len + 9u) % 64u);
  }
  let padded_len = total_len + 1u + padding_len + 8u;
  let num_blocks = padded_len / 64u;

  var h = array<u32,8>(0x6a09e667u,0xbb67ae85u,0x3c6ef372u,0xa54ff53au,0x510e527fu,0x9b05688cu,0x1f83d9abu,0x5be0cd19u);

  for(var b:u32=0u;b<num_blocks;b=b+1u){
    var w = array<u32,16>();
    for(var wi:u32=0u; wi<16u; wi=wi+1u){
      let base = b*64u + wi*4u;
      var a0:u32=0u; var a1:u32=0u; var a2:u32=0u; var a3:u32=0u;

      for(var k:u32=0u;k<4u;k=k+1u){
        let gi = base + k;
        var bv:u32=0u;
        if(gi < params.challengeLen){ bv = challengeBytes[gi] & 0xFFu; }
        else if(gi < params.challengeLen + nonce_len){ bv = nonce_ascii[gi - params.challengeLen]; }
        else if(gi == total_len){ bv = 0x80u; }
        else if(gi >= padded_len - 8u){
          let li = gi - (padded_len - 8u);
          let tb = total_len * 8u;
          if(li >= 4u){ let sh = (7u - li)*8u; bv = (tb >> sh) & 0xFFu; }
        }
        if(k==0u){ a0=bv; } else if(k==1u){ a1=bv; } else if(k==2u){ a2=bv; } else { a3=bv; }
      }
      w[wi] = (a0<<24u)|(a1<<16u)|(a2<<8u)|a3;
    }
    h = sha256_compress(w,h);
  }

  let second = sha256_of_digest(h);

  var lz:u32=0u;
  for(var i:u32=0u;i<8u;i=i+1u){
    let c = countLeadingZeros(second[i]); lz = lz + c; if(c != 32u){ break; }
  }

  let prev = atomicMax(&bestInfo.bestLz, lz);
  if(lz > prev && lz == atomicLoad(&bestInfo.bestLz)){
    for(var i:u32=0u;i<8u;i=i+1u){ bestDigest[i]=second[i]; }
    atomicStore(&bestInfo.bestNonceLo, nlo);
    atomicStore(&bestInfo.bestNonceHi, nhi);
  }
}`;
    const module = this.device.createShaderModule({ code: shaderCode });
    this.pipeline = this.device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });

    this._uniformBuffer = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this._bestDigestBuffer = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    this._bestInfoBuffer = this.device.createBuffer({ size: 12, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    this._readDigest = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    this._readInfo = this.device.createBuffer({ size: 12, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });

    this._bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._uniformBuffer } },
        { binding: 1, resource: { buffer: this.challengeBuffer ?? this.device.createBuffer({size:4, usage: GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}) } },
        { binding: 2, resource: { buffer: this._bestDigestBuffer } },
        { binding: 3, resource: { buffer: this._bestInfoBuffer } }
      ]
    });
  }

  async setChallenge(challengeBytes) {
    if (!this.device) await this.init();
    this.challengeLen = challengeBytes.length >>> 0;
    const u32 = new Uint32Array(this.challengeLen);
    for (let i=0;i<this.challengeLen;i++) u32[i] = challengeBytes[i];

    this.challengeBuffer?.destroy?.();
    this.challengeBuffer = this.device.createBuffer({
      size: Math.max(4, u32.byteLength),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    this.queue.writeBuffer(this.challengeBuffer, 0, u32);
    this._bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._uniformBuffer } },
        { binding: 1, resource: { buffer: this.challengeBuffer } },
        { binding: 2, resource: { buffer: this._bestDigestBuffer } },
        { binding: 3, resource: { buffer: this._bestInfoBuffer } }
      ]
    });
  }

  setStartNonceForBatch(startNonceBigInt){
    const lo = Number(startNonceBigInt & 0xFFFFFFFFn) >>> 0;
    const hi = Number((startNonceBigInt >> 32n) & 0xFFFFFFFFn) >>> 0;
    this._startLo = lo; this._startHi = hi;
  }

  async computeBatch(startNonceBigInt, count){
    if (!this.device) await this.init();
    this.setStartNonceForBatch(startNonceBigInt);

    const uniformData = new Uint32Array([ this._startLo>>>0, this._startHi>>>0, count>>>0, this.challengeLen>>>0, 0, 0 ]);
    this.queue.writeBuffer(this._uniformBuffer, 0, uniformData);

    this.queue.writeBuffer(this._bestDigestBuffer, 0, new Uint8Array(32));
    this.queue.writeBuffer(this._bestInfoBuffer, 0, new Uint32Array([0,0,0]));

    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this._bindGroup);
    const groups = Math.ceil(count / this.workgroupSize);
    pass.dispatchWorkgroups(groups);
    pass.end();

    enc.copyBufferToBuffer(this._bestDigestBuffer, 0, this._readDigest, 0, 32);
    enc.copyBufferToBuffer(this._bestInfoBuffer, 0, this._readInfo, 0, 12);
    this.queue.submit([enc.finish()]);

    await this._readDigest.mapAsync(GPUMapMode.READ);
    const bestWords = new Uint32Array(this._readDigest.getMappedRange()).slice(); this._readDigest.unmap();
    await this._readInfo.mapAsync(GPUMapMode.READ);
    const infoArr = new Uint32Array(this._readInfo.getMappedRange()).slice(); this._readInfo.unmap();

    return {
      bestWords,
      bestLeadingZeros: infoArr[0]>>>0,
      bestNonceLo: infoArr[1]>>>0,
      bestNonceHi: infoArr[2]>>>0
    };
  }

  getRecommendedBatchSize(){
    const lim = this.device?.limits;
    const maxGroups = lim?.maxComputeWorkgroupsPerDimension ?? 65535;
    const wg = this.workgroupSize || 256;
    return wg * maxGroups;
  }

  destroy(){
    this.challengeBuffer?.destroy?.();
    this._uniformBuffer?.destroy?.(); this._bestDigestBuffer?.destroy?.();
    this._bestInfoBuffer?.destroy?.(); this._readDigest?.destroy?.(); this._readInfo?.destroy?.();
    this.device = null;
  }
}

if (typeof window !== 'undefined') window.WebGPUMiner = WebGPUMiner;
