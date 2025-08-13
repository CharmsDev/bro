import { a as Q, H as R, S as F, C as Z, b as N, d as C, M as $, e as r } from "./index-JAkBZLNc.js";
const w = BigInt(2 ** 32 - 1), z = BigInt(32);
function v(a, s = false) {
  return s ? { h: Number(a & w), l: Number(a >> z & w) } : { h: Number(a >> z & w) | 0, l: Number(a & w) | 0 };
}
function c0(a, s = false) {
  const c = a.length;
  let t = new Uint32Array(c), e = new Uint32Array(c);
  for (let x = 0; x < c; x++) {
    const { h: i, l: b } = v(a[x], s);
    [t[x], e[x]] = [i, b];
  }
  return [t, e];
}
const O = (a, s, c) => a >>> c, P = (a, s, c) => a << 32 - c | s >>> c, W = (a, s, c) => a >>> c | s << 32 - c, p = (a, s, c) => a << 32 - c | s >>> c, K = (a, s, c) => a << 64 - c | s >>> c - 32, T = (a, s, c) => a >>> c - 32 | s << 64 - c;
function m(a, s, c, t) {
  const e = (s >>> 0) + (t >>> 0);
  return { h: a + c + (e / 2 ** 32 | 0) | 0, l: e | 0 };
}
const t0 = (a, s, c) => (a >>> 0) + (s >>> 0) + (c >>> 0), s0 = (a, s, c, t) => s + c + t + (a / 2 ** 32 | 0) | 0, e0 = (a, s, c, t) => (a >>> 0) + (s >>> 0) + (c >>> 0) + (t >>> 0), a0 = (a, s, c, t, e) => s + c + t + e + (a / 2 ** 32 | 0) | 0, h0 = (a, s, c, t, e) => (a >>> 0) + (s >>> 0) + (c >>> 0) + (t >>> 0) + (e >>> 0), x0 = (a, s, c, t, e, x) => s + c + t + e + x + (a / 2 ** 32 | 0) | 0, b0 = Uint32Array.from([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]), G = new Uint32Array(64);
class f0 extends R {
  constructor(s = 32) {
    super(64, s, 8, false), this.A = F[0] | 0, this.B = F[1] | 0, this.C = F[2] | 0, this.D = F[3] | 0, this.E = F[4] | 0, this.F = F[5] | 0, this.G = F[6] | 0, this.H = F[7] | 0;
  }
  get() {
    const { A: s, B: c, C: t, D: e, E: x, F: i, G: b, H: n } = this;
    return [s, c, t, e, x, i, b, n];
  }
  set(s, c, t, e, x, i, b, n) {
    this.A = s | 0, this.B = c | 0, this.C = t | 0, this.D = e | 0, this.E = x | 0, this.F = i | 0, this.G = b | 0, this.H = n | 0;
  }
  process(s, c) {
    for (let h = 0; h < 16; h++, c += 4) G[h] = s.getUint32(c, false);
    for (let h = 16; h < 64; h++) {
      const d = G[h - 15], l = G[h - 2], u = C(d, 7) ^ C(d, 18) ^ d >>> 3, H = C(l, 17) ^ C(l, 19) ^ l >>> 10;
      G[h] = H + G[h - 7] + u + G[h - 16] | 0;
    }
    let { A: t, B: e, C: x, D: i, E: b, F: n, G: o, H: A } = this;
    for (let h = 0; h < 64; h++) {
      const d = C(b, 6) ^ C(b, 11) ^ C(b, 25), l = A + d + Z(b, n, o) + b0[h] + G[h] | 0, H = (C(t, 2) ^ C(t, 13) ^ C(t, 22)) + $(t, e, x) | 0;
      A = o, o = n, n = b, b = i + l | 0, i = x, x = e, e = t, t = l + H | 0;
    }
    t = t + this.A | 0, e = e + this.B | 0, x = x + this.C | 0, i = i + this.D | 0, b = b + this.E | 0, n = n + this.F | 0, o = o + this.G | 0, A = A + this.H | 0, this.set(t, e, x, i, b, n, o, A);
  }
  roundClean() {
    N(G);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), N(this.buffer);
  }
}
const X = c0(["0x428a2f98d728ae22", "0x7137449123ef65cd", "0xb5c0fbcfec4d3b2f", "0xe9b5dba58189dbbc", "0x3956c25bf348b538", "0x59f111f1b605d019", "0x923f82a4af194f9b", "0xab1c5ed5da6d8118", "0xd807aa98a3030242", "0x12835b0145706fbe", "0x243185be4ee4b28c", "0x550c7dc3d5ffb4e2", "0x72be5d74f27b896f", "0x80deb1fe3b1696b1", "0x9bdc06a725c71235", "0xc19bf174cf692694", "0xe49b69c19ef14ad2", "0xefbe4786384f25e3", "0x0fc19dc68b8cd5b5", "0x240ca1cc77ac9c65", "0x2de92c6f592b0275", "0x4a7484aa6ea6e483", "0x5cb0a9dcbd41fbd4", "0x76f988da831153b5", "0x983e5152ee66dfab", "0xa831c66d2db43210", "0xb00327c898fb213f", "0xbf597fc7beef0ee4", "0xc6e00bf33da88fc2", "0xd5a79147930aa725", "0x06ca6351e003826f", "0x142929670a0e6e70", "0x27b70a8546d22ffc", "0x2e1b21385c26c926", "0x4d2c6dfc5ac42aed", "0x53380d139d95b3df", "0x650a73548baf63de", "0x766a0abb3c77b2a8", "0x81c2c92e47edaee6", "0x92722c851482353b", "0xa2bfe8a14cf10364", "0xa81a664bbc423001", "0xc24b8b70d0f89791", "0xc76c51a30654be30", "0xd192e819d6ef5218", "0xd69906245565a910", "0xf40e35855771202a", "0x106aa07032bbd1b8", "0x19a4c116b8d2d0c8", "0x1e376c085141ab53", "0x2748774cdf8eeb99", "0x34b0bcb5e19b48a8", "0x391c0cb3c5c95a63", "0x4ed8aa4ae3418acb", "0x5b9cca4f7763e373", "0x682e6ff3d6b2b8a3", "0x748f82ee5defb2fc", "0x78a5636f43172f60", "0x84c87814a1f0ab72", "0x8cc702081a6439ec", "0x90befffa23631e28", "0xa4506cebde82bde9", "0xbef9a3f7b2c67915", "0xc67178f2e372532b", "0xca273eceea26619c", "0xd186b8c721c0c207", "0xeada7dd6cde0eb1e", "0xf57d4f7fee6ed178", "0x06f067aa72176fba", "0x0a637dc5a2c898a6", "0x113f9804bef90dae", "0x1b710b35131c471b", "0x28db77f523047d84", "0x32caab7b40c72493", "0x3c9ebe0a15c9bebc", "0x431d67c49c100d4c", "0x4cc5d4becb3e42b6", "0x597f299cfc657e2a", "0x5fcb6fab3ad6faec", "0x6c44198c4a475817"].map((a) => BigInt(a))), i0 = X[0], d0 = X[1], _ = new Uint32Array(80), U = new Uint32Array(80);
class n0 extends R {
  constructor(s = 64) {
    super(128, s, 16, false), this.Ah = r[0] | 0, this.Al = r[1] | 0, this.Bh = r[2] | 0, this.Bl = r[3] | 0, this.Ch = r[4] | 0, this.Cl = r[5] | 0, this.Dh = r[6] | 0, this.Dl = r[7] | 0, this.Eh = r[8] | 0, this.El = r[9] | 0, this.Fh = r[10] | 0, this.Fl = r[11] | 0, this.Gh = r[12] | 0, this.Gl = r[13] | 0, this.Hh = r[14] | 0, this.Hl = r[15] | 0;
  }
  get() {
    const { Ah: s, Al: c, Bh: t, Bl: e, Ch: x, Cl: i, Dh: b, Dl: n, Eh: o, El: A, Fh: h, Fl: d, Gh: l, Gl: u, Hh: H, Hl: B } = this;
    return [s, c, t, e, x, i, b, n, o, A, h, d, l, u, H, B];
  }
  set(s, c, t, e, x, i, b, n, o, A, h, d, l, u, H, B) {
    this.Ah = s | 0, this.Al = c | 0, this.Bh = t | 0, this.Bl = e | 0, this.Ch = x | 0, this.Cl = i | 0, this.Dh = b | 0, this.Dl = n | 0, this.Eh = o | 0, this.El = A | 0, this.Fh = h | 0, this.Fl = d | 0, this.Gh = l | 0, this.Gl = u | 0, this.Hh = H | 0, this.Hl = B | 0;
  }
  process(s, c) {
    for (let f = 0; f < 16; f++, c += 4) _[f] = s.getUint32(c), U[f] = s.getUint32(c += 4);
    for (let f = 16; f < 80; f++) {
      const D = _[f - 15] | 0, E = U[f - 15] | 0, J = W(D, E, 1) ^ W(D, E, 8) ^ O(D, E, 7), V = p(D, E, 1) ^ p(D, E, 8) ^ P(D, E, 7), S = _[f - 2] | 0, g = U[f - 2] | 0, I = W(S, g, 19) ^ K(S, g, 61) ^ O(S, g, 6), j = p(S, g, 19) ^ T(S, g, 61) ^ P(S, g, 6), L = e0(V, j, U[f - 7], U[f - 16]), k = a0(L, J, I, _[f - 7], _[f - 16]);
      _[f] = k | 0, U[f] = L | 0;
    }
    let { Ah: t, Al: e, Bh: x, Bl: i, Ch: b, Cl: n, Dh: o, Dl: A, Eh: h, El: d, Fh: l, Fl: u, Gh: H, Gl: B, Hh: y, Hl: M } = this;
    for (let f = 0; f < 80; f++) {
      const D = W(h, d, 14) ^ W(h, d, 18) ^ K(h, d, 41), E = p(h, d, 14) ^ p(h, d, 18) ^ T(h, d, 41), J = h & l ^ ~h & H, V = d & u ^ ~d & B, S = h0(M, E, V, d0[f], U[f]), g = x0(S, y, D, J, i0[f], _[f]), I = S | 0, j = W(t, e, 28) ^ K(t, e, 34) ^ K(t, e, 39), L = p(t, e, 28) ^ T(t, e, 34) ^ T(t, e, 39), k = t & x ^ t & b ^ x & b, Y = e & i ^ e & n ^ i & n;
      y = H | 0, M = B | 0, H = l | 0, B = u | 0, l = h | 0, u = d | 0, { h, l: d } = m(o | 0, A | 0, g | 0, I | 0), o = b | 0, A = n | 0, b = x | 0, n = i | 0, x = t | 0, i = e | 0;
      const q = t0(I, L, Y);
      t = s0(q, g, j, k), e = q | 0;
    }
    ({ h: t, l: e } = m(this.Ah | 0, this.Al | 0, t | 0, e | 0)), { h: x, l: i } = m(this.Bh | 0, this.Bl | 0, x | 0, i | 0), { h: b, l: n } = m(this.Ch | 0, this.Cl | 0, b | 0, n | 0), { h: o, l: A } = m(this.Dh | 0, this.Dl | 0, o | 0, A | 0), { h, l: d } = m(this.Eh | 0, this.El | 0, h | 0, d | 0), { h: l, l: u } = m(this.Fh | 0, this.Fl | 0, l | 0, u | 0), { h: H, l: B } = m(this.Gh | 0, this.Gl | 0, H | 0, B | 0), { h: y, l: M } = m(this.Hh | 0, this.Hl | 0, y | 0, M | 0), this.set(t, e, x, i, b, n, o, A, h, d, l, u, H, B, y, M);
  }
  roundClean() {
    N(_, U);
  }
  destroy() {
    N(this.buffer), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}
const o0 = Q(() => new f0()), r0 = Q(() => new n0());
export {
  o0 as a,
  r0 as s
};
