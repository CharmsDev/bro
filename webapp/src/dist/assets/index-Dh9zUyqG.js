import { u as n, c as m, h as v, s as c, r as E, m as x } from "./index-JAkBZLNc.js";
import { s as b, a as g } from "./sha2-DoG4QkU_.js";
/*! scure-bip32 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) */
const y = c.secp256k1.ProjectivePoint, u = m(g);
function K(s) {
  n.abytes(s);
  const e = s.length === 0 ? "0" : n.bytesToHex(s);
  return BigInt("0x" + e);
}
function k(s) {
  if (typeof s != "bigint") throw new Error("bigint expected");
  return n.hexToBytes(s.toString(16).padStart(64, "0"));
}
const C = n.utf8ToBytes("Bitcoin seed"), l = { private: 76066276, public: 76067358 }, f = 2147483648, B = (s) => E(g(s)), N = (s) => n.createView(s).getUint32(0, false), d = (s) => {
  if (!Number.isSafeInteger(s) || s < 0 || s > 2 ** 32 - 1) throw new Error("invalid number, should be from 0 to 2**32-1, got " + s);
  const e = new Uint8Array(4);
  return n.createView(e).setUint32(0, s, false), e;
};
class p {
  get fingerprint() {
    if (!this.pubHash) throw new Error("No publicKey set!");
    return N(this.pubHash);
  }
  get identifier() {
    return this.pubHash;
  }
  get pubKeyHash() {
    return this.pubHash;
  }
  get privateKey() {
    return this.privKeyBytes || null;
  }
  get publicKey() {
    return this.pubKey || null;
  }
  get privateExtendedKey() {
    const e = this.privateKey;
    if (!e) throw new Error("No private key");
    return u.encode(this.serialize(this.versions.private, n.concatBytes(new Uint8Array([0]), e)));
  }
  get publicExtendedKey() {
    if (!this.pubKey) throw new Error("No public key");
    return u.encode(this.serialize(this.versions.public, this.pubKey));
  }
  static fromMasterSeed(e, t = l) {
    if (n.abytes(e), 8 * e.length < 128 || 8 * e.length > 512) throw new Error("HDKey: seed length must be between 128 and 512 bits; 256 bits is advised, got " + e.length);
    const r = v(b, C, e);
    return new p({ versions: t, chainCode: r.slice(32), privateKey: r.slice(0, 32) });
  }
  static fromExtendedKey(e, t = l) {
    const r = u.decode(e), o = n.createView(r), a = o.getUint32(0, false), h = { versions: t, depth: r[4], parentFingerprint: o.getUint32(5, false), index: o.getUint32(9, false), chainCode: r.slice(13, 45) }, i = r.slice(45), w = i[0] === 0;
    if (a !== t[w ? "private" : "public"]) throw new Error("Version mismatch");
    return w ? new p({ ...h, privateKey: i.slice(1) }) : new p({ ...h, publicKey: i });
  }
  static fromJSON(e) {
    return p.fromExtendedKey(e.xpriv);
  }
  constructor(e) {
    if (this.depth = 0, this.index = 0, this.chainCode = null, this.parentFingerprint = 0, !e || typeof e != "object") throw new Error("HDKey.constructor must not be called directly");
    if (this.versions = e.versions || l, this.depth = e.depth || 0, this.chainCode = e.chainCode || null, this.index = e.index || 0, this.parentFingerprint = e.parentFingerprint || 0, !this.depth && (this.parentFingerprint || this.index)) throw new Error("HDKey: zero depth with non-zero index/parent fingerprint");
    if (e.publicKey && e.privateKey) throw new Error("HDKey: publicKey and privateKey at same time.");
    if (e.privateKey) {
      if (!c.secp256k1.utils.isValidPrivateKey(e.privateKey)) throw new Error("Invalid private key");
      this.privKey = typeof e.privateKey == "bigint" ? e.privateKey : K(e.privateKey), this.privKeyBytes = k(this.privKey), this.pubKey = c.secp256k1.getPublicKey(e.privateKey, true);
    } else if (e.publicKey) this.pubKey = y.fromHex(e.publicKey).toRawBytes(true);
    else throw new Error("HDKey: no public or private key provided");
    this.pubHash = B(this.pubKey);
  }
  derive(e) {
    if (!/^[mM]'?/.test(e)) throw new Error('Path must start with "m" or "M"');
    if (/^[mM]'?$/.test(e)) return this;
    const t = e.replace(/^[mM]'?\//, "").split("/");
    let r = this;
    for (const o of t) {
      const a = /^(\d+)('?)$/.exec(o), h = a && a[1];
      if (!a || a.length !== 3 || typeof h != "string") throw new Error("invalid child index: " + o);
      let i = +h;
      if (!Number.isSafeInteger(i) || i >= f) throw new Error("Invalid index");
      a[2] === "'" && (i += f), r = r.deriveChild(i);
    }
    return r;
  }
  deriveChild(e) {
    if (!this.pubKey || !this.chainCode) throw new Error("No publicKey or chainCode set");
    let t = d(e);
    if (e >= f) {
      const i = this.privateKey;
      if (!i) throw new Error("Could not derive hardened child key");
      t = n.concatBytes(new Uint8Array([0]), i, t);
    } else t = n.concatBytes(this.pubKey, t);
    const r = v(b, this.chainCode, t), o = K(r.slice(0, 32)), a = r.slice(32);
    if (!c.secp256k1.utils.isValidPrivateKey(o)) throw new Error("Tweak bigger than curve order");
    const h = { versions: this.versions, chainCode: a, depth: this.depth + 1, parentFingerprint: this.fingerprint, index: e };
    try {
      if (this.privateKey) {
        const i = x(this.privKey + o, c.secp256k1.CURVE.n);
        if (!c.secp256k1.utils.isValidPrivateKey(i)) throw new Error("The tweak was out of range or the resulted private key is invalid");
        h.privateKey = i;
      } else {
        const i = y.fromHex(this.pubKey).add(y.fromPrivateKey(o));
        if (i.equals(y.ZERO)) throw new Error("The tweak was equal to negative P, which made the result key invalid");
        h.publicKey = i.toRawBytes(true);
      }
      return new p(h);
    } catch {
      return this.deriveChild(e + 1);
    }
  }
  sign(e) {
    if (!this.privateKey) throw new Error("No privateKey set!");
    return n.abytes(e, 32), c.secp256k1.sign(e, this.privKey).toCompactRawBytes();
  }
  verify(e, t) {
    if (n.abytes(e, 32), n.abytes(t, 64), !this.publicKey) throw new Error("No publicKey set!");
    let r;
    try {
      r = c.secp256k1.Signature.fromCompact(t);
    } catch {
      return false;
    }
    return c.secp256k1.verify(r, e, this.publicKey);
  }
  wipePrivateData() {
    return this.privKey = void 0, this.privKeyBytes && (this.privKeyBytes.fill(0), this.privKeyBytes = void 0), this;
  }
  toJSON() {
    return { xpriv: this.privateExtendedKey, xpub: this.publicExtendedKey };
  }
  serialize(e, t) {
    if (!this.chainCode) throw new Error("No chainCode set");
    return n.abytes(t, 33), n.concatBytes(d(e), new Uint8Array([this.depth]), d(this.parentFingerprint), d(this.index), this.chainCode, t);
  }
}
export {
  f as HARDENED_OFFSET,
  p as HDKey
};
