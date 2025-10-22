import {
  schnorr,
  secp256k1
} from "./chunk-VKGU4GBS.js";
import {
  ripemd160
} from "./chunk-KHBBPVKB.js";
import "./chunk-KVHNYKD5.js";
import {
  bech32,
  bech32m,
  createBase58check,
  hex,
  utf8
} from "./chunk-KMNSGEX4.js";
import {
  sha256
} from "./chunk-2MDE53YM.js";
import "./chunk-2TUXWMP5.js";

// node_modules/micro-packed/lib/esm/index.js
var EMPTY = new Uint8Array();
var NULL = new Uint8Array([0]);
function equalBytes(a, b) {
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++)
    if (a[i] !== b[i])
      return false;
  return true;
}
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    if (!isBytes(a))
      throw new Error("Uint8Array expected");
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}
var createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}
function isNum(num) {
  return Number.isSafeInteger(num);
}
var utils = {
  equalBytes,
  isBytes,
  isCoder,
  checkBounds,
  concatBytes,
  createView,
  isPlainObject
};
var lengthCoder = (len) => {
  if (len !== null && typeof len !== "string" && !isCoder(len) && !isBytes(len) && !isNum(len)) {
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${len} (${typeof len})`);
  }
  return {
    encodeStream(w, value) {
      if (len === null)
        return;
      if (isCoder(len))
        return len.encodeStream(w, value);
      let byteLen;
      if (typeof len === "number")
        byteLen = len;
      else if (typeof len === "string")
        byteLen = Path.resolve(w.stack, len);
      if (typeof byteLen === "bigint")
        byteLen = Number(byteLen);
      if (byteLen === void 0 || byteLen !== value)
        throw w.err(`Wrong length: ${byteLen} len=${len} exp=${value} (${typeof value})`);
    },
    decodeStream(r) {
      let byteLen;
      if (isCoder(len))
        byteLen = Number(len.decodeStream(r));
      else if (typeof len === "number")
        byteLen = len;
      else if (typeof len === "string")
        byteLen = Path.resolve(r.stack, len);
      if (typeof byteLen === "bigint")
        byteLen = Number(byteLen);
      if (typeof byteLen !== "number")
        throw r.err(`Wrong length: ${byteLen}`);
      return byteLen;
    }
  };
};
var Bitset = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (len) => Math.ceil(len / 32),
  create: (len) => new Uint32Array(Bitset.len(len)),
  clean: (bs) => bs.fill(0),
  debug: (bs) => Array.from(bs).map((i) => (i >>> 0).toString(2).padStart(32, "0")),
  checkLen: (bs, len) => {
    if (Bitset.len(len) === bs.length)
      return;
    throw new Error(`wrong length=${bs.length}. Expected: ${Bitset.len(len)}`);
  },
  chunkLen: (bsLen, pos, len) => {
    if (pos < 0)
      throw new Error(`wrong pos=${pos}`);
    if (pos + len > bsLen)
      throw new Error(`wrong range=${pos}/${len} of ${bsLen}`);
  },
  set: (bs, chunk, value, allowRewrite = true) => {
    if (!allowRewrite && (bs[chunk] & value) !== 0)
      return false;
    bs[chunk] |= value;
    return true;
  },
  pos: (pos, i) => ({
    chunk: Math.floor((pos + i) / 32),
    mask: 1 << 32 - (pos + i) % 32 - 1
  }),
  indices: (bs, len, invert = false) => {
    Bitset.checkLen(bs, len);
    const { FULL_MASK, BITS } = Bitset;
    const left = BITS - len % BITS;
    const lastMask = left ? FULL_MASK >>> left << left : FULL_MASK;
    const res = [];
    for (let i = 0; i < bs.length; i++) {
      let c = bs[i];
      if (invert)
        c = ~c;
      if (i === bs.length - 1)
        c &= lastMask;
      if (c === 0)
        continue;
      for (let j = 0; j < BITS; j++) {
        const m = 1 << BITS - j - 1;
        if (c & m)
          res.push(i * BITS + j);
      }
    }
    return res;
  },
  range: (arr) => {
    const res = [];
    let cur;
    for (const i of arr) {
      if (cur === void 0 || i !== cur.pos + cur.length)
        res.push(cur = { pos: i, length: 1 });
      else
        cur.length += 1;
    }
    return res;
  },
  rangeDebug: (bs, len, invert = false) => `[${Bitset.range(Bitset.indices(bs, len, invert)).map((i) => `(${i.pos}/${i.length})`).join(", ")}]`,
  setRange: (bs, bsLen, pos, len, allowRewrite = true) => {
    Bitset.chunkLen(bsLen, pos, len);
    const { FULL_MASK, BITS } = Bitset;
    const first = pos % BITS ? Math.floor(pos / BITS) : void 0;
    const lastPos = pos + len;
    const last = lastPos % BITS ? Math.floor(lastPos / BITS) : void 0;
    if (first !== void 0 && first === last)
      return Bitset.set(bs, first, FULL_MASK >>> BITS - len << BITS - len - pos, allowRewrite);
    if (first !== void 0) {
      if (!Bitset.set(bs, first, FULL_MASK >>> pos % BITS, allowRewrite))
        return false;
    }
    const start = first !== void 0 ? first + 1 : pos / BITS;
    const end = last !== void 0 ? last : lastPos / BITS;
    for (let i = start; i < end; i++)
      if (!Bitset.set(bs, i, FULL_MASK, allowRewrite))
        return false;
    if (last !== void 0 && first !== last) {
      if (!Bitset.set(bs, last, FULL_MASK << BITS - lastPos % BITS, allowRewrite))
        return false;
    }
    return true;
  }
};
var Path = {
  /**
   * Internal method for handling stack of paths (debug, errors, dynamic fields via path)
   * This is looks ugly (callback), but allows us to force stack cleaning by construction (.pop always after function).
   * Also, this makes impossible:
   * - pushing field when stack is empty
   * - pushing field inside of field (real bug)
   * NOTE: we don't want to do '.pop' on error!
   */
  pushObj: (stack, obj, objFn) => {
    const last = { obj };
    stack.push(last);
    objFn((field, fieldFn) => {
      last.field = field;
      fieldFn();
      last.field = void 0;
    });
    stack.pop();
  },
  path: (stack) => {
    const res = [];
    for (const i of stack)
      if (i.field !== void 0)
        res.push(i.field);
    return res.join("/");
  },
  err: (name, stack, msg) => {
    const err = new Error(`${name}(${Path.path(stack)}): ${typeof msg === "string" ? msg : msg.message}`);
    if (msg instanceof Error && msg.stack)
      err.stack = msg.stack;
    return err;
  },
  resolve: (stack, path) => {
    const parts = path.split("/");
    const objPath = stack.map((i2) => i2.obj);
    let i = 0;
    for (; i < parts.length; i++) {
      if (parts[i] === "..")
        objPath.pop();
      else
        break;
    }
    let cur = objPath.pop();
    for (; i < parts.length; i++) {
      if (!cur || cur[parts[i]] === void 0)
        return void 0;
      cur = cur[parts[i]];
    }
    return cur;
  }
};
var _Reader = class __Reader {
  constructor(data, opts = {}, stack = [], parent = void 0, parentOffset = 0) {
    this.pos = 0;
    this.bitBuf = 0;
    this.bitPos = 0;
    this.data = data;
    this.opts = opts;
    this.stack = stack;
    this.parent = parent;
    this.parentOffset = parentOffset;
    this.view = createView(data);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    if (this.bs)
      return;
    this.bs = Bitset.create(this.data.length);
    Bitset.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads);
  }
  markBytesBS(pos, len) {
    if (this.parent)
      return this.parent.markBytesBS(this.parentOffset + pos, len);
    if (!len)
      return true;
    if (!this.bs)
      return true;
    return Bitset.setRange(this.bs, this.data.length, pos, len, false);
  }
  markBytes(len) {
    const pos = this.pos;
    this.pos += len;
    const res = this.markBytesBS(pos, len);
    if (!this.opts.allowMultipleReads && !res)
      throw this.err(`multiple read pos=${this.pos} len=${len}`);
    return res;
  }
  pushObj(obj, objFn) {
    return Path.pushObj(this.stack, obj, objFn);
  }
  readView(n, fn) {
    if (!Number.isFinite(n))
      throw this.err(`readView: wrong length=${n}`);
    if (this.pos + n > this.data.length)
      throw this.err("readView: Unexpected end of buffer");
    const res = fn(this.view, this.pos);
    this.markBytes(n);
    return res;
  }
  // read bytes by absolute offset
  absBytes(n) {
    if (n > this.data.length)
      throw new Error("Unexpected end of buffer");
    return this.data.subarray(n);
  }
  finish() {
    if (this.opts.allowUnreadBytes)
      return;
    if (this.bitPos) {
      throw this.err(`${this.bitPos} bits left after unpack: ${hex.encode(this.data.slice(this.pos))}`);
    }
    if (this.bs && !this.parent) {
      const notRead = Bitset.indices(this.bs, this.data.length, true);
      if (notRead.length) {
        const formatted = Bitset.range(notRead).map(({ pos, length }) => `(${pos}/${length})[${hex.encode(this.data.subarray(pos, pos + length))}]`).join(", ");
        throw this.err(`unread byte ranges: ${formatted} (total=${this.data.length})`);
      } else
        return;
    }
    if (!this.isEnd()) {
      throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${hex.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(msg) {
    return Path.err("Reader", this.stack, msg);
  }
  offsetReader(n) {
    if (n > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new __Reader(this.absBytes(n), this.opts, this.stack, this, n);
  }
  bytes(n, peek = false) {
    if (this.bitPos)
      throw this.err("readBytes: bitPos not empty");
    if (!Number.isFinite(n))
      throw this.err(`readBytes: wrong length=${n}`);
    if (this.pos + n > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const slice = this.data.subarray(this.pos, this.pos + n);
    if (!peek)
      this.markBytes(n);
    return slice;
  }
  byte(peek = false) {
    if (this.bitPos)
      throw this.err("readByte: bitPos not empty");
    if (this.pos + 1 > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const data = this.data[this.pos];
    if (!peek)
      this.markBytes(1);
    return data;
  }
  get leftBytes() {
    return this.data.length - this.pos;
  }
  get totalBytes() {
    return this.data.length;
  }
  isEnd() {
    return this.pos >= this.data.length && !this.bitPos;
  }
  // bits are read in BE mode (left to right): (0b1000_0000).readBits(1) == 1
  bits(bits) {
    if (bits > 32)
      throw this.err("BitReader: cannot read more than 32 bits in single call");
    let out = 0;
    while (bits) {
      if (!this.bitPos) {
        this.bitBuf = this.byte();
        this.bitPos = 8;
      }
      const take = Math.min(bits, this.bitPos);
      this.bitPos -= take;
      out = out << take | this.bitBuf >> this.bitPos & 2 ** take - 1;
      this.bitBuf &= 2 ** this.bitPos - 1;
      bits -= take;
    }
    return out >>> 0;
  }
  find(needle, pos = this.pos) {
    if (!isBytes(needle))
      throw this.err(`find: needle is not bytes! ${needle}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!needle.length)
      throw this.err(`find: needle is empty`);
    for (let idx = pos; (idx = this.data.indexOf(needle[0], idx)) !== -1; idx++) {
      if (idx === -1)
        return;
      const leftBytes = this.data.length - idx;
      if (leftBytes < needle.length)
        return;
      if (equalBytes(needle, this.data.subarray(idx, idx + needle.length)))
        return idx;
    }
    return;
  }
};
var _Writer = class {
  constructor(stack = []) {
    this.pos = 0;
    this.buffers = [];
    this.ptrs = [];
    this.bitBuf = 0;
    this.bitPos = 0;
    this.viewBuf = new Uint8Array(8);
    this.finished = false;
    this.stack = stack;
    this.view = createView(this.viewBuf);
  }
  pushObj(obj, objFn) {
    return Path.pushObj(this.stack, obj, objFn);
  }
  writeView(len, fn) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!isNum(len) || len > 8)
      throw new Error(`wrong writeView length=${len}`);
    fn(this.view);
    this.bytes(this.viewBuf.slice(0, len));
    this.viewBuf.fill(0);
  }
  // User methods
  err(msg) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Path.err("Reader", this.stack, msg);
  }
  bytes(b) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeBytes: ends with non-empty bit buffer");
    this.buffers.push(b);
    this.pos += b.length;
  }
  byte(b) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeByte: ends with non-empty bit buffer");
    this.buffers.push(new Uint8Array([b]));
    this.pos++;
  }
  finish(clean = true) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("buffer: ends with non-empty bit buffer");
    const buffers = this.buffers.concat(this.ptrs.map((i) => i.buffer));
    const sum = buffers.map((b) => b.length).reduce((a, b) => a + b, 0);
    const buf = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < buffers.length; i++) {
      const a = buffers[i];
      buf.set(a, pad);
      pad += a.length;
    }
    for (let pos = this.pos, i = 0; i < this.ptrs.length; i++) {
      const ptr = this.ptrs[i];
      buf.set(ptr.ptr.encode(pos), ptr.pos);
      pos += ptr.buffer.length;
    }
    if (clean) {
      this.buffers = [];
      for (const p of this.ptrs)
        p.buffer.fill(0);
      this.ptrs = [];
      this.finished = true;
      this.bitBuf = 0;
    }
    return buf;
  }
  bits(value, bits) {
    if (bits > 32)
      throw this.err("writeBits: cannot write more than 32 bits in single call");
    if (value >= 2 ** bits)
      throw this.err(`writeBits: value (${value}) >= 2**bits (${bits})`);
    while (bits) {
      const take = Math.min(bits, 8 - this.bitPos);
      this.bitBuf = this.bitBuf << take | value >> bits - take;
      this.bitPos += take;
      bits -= take;
      value &= 2 ** bits - 1;
      if (this.bitPos === 8) {
        this.bitPos = 0;
        this.buffers.push(new Uint8Array([this.bitBuf]));
        this.pos++;
      }
    }
  }
};
var swapEndianness = (b) => Uint8Array.from(b).reverse();
function checkBounds(value, bits, signed) {
  if (signed) {
    const signBit = 2n ** (bits - 1n);
    if (value < -signBit || value >= signBit)
      throw new Error(`value out of signed bounds. Expected ${-signBit} <= ${value} < ${signBit}`);
  } else {
    if (0n > value || value >= 2n ** bits)
      throw new Error(`value out of unsigned bounds. Expected 0 <= ${value} < ${2n ** bits}`);
  }
}
function _wrap(inner) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: inner.encodeStream,
    decodeStream: inner.decodeStream,
    size: inner.size,
    encode: (value) => {
      const w = new _Writer();
      inner.encodeStream(w, value);
      return w.finish();
    },
    decode: (data, opts = {}) => {
      const r = new _Reader(data, opts);
      const res = inner.decodeStream(r);
      r.finish();
      return res;
    }
  };
}
function validate(inner, fn) {
  if (!isCoder(inner))
    throw new Error(`validate: invalid inner value ${inner}`);
  if (typeof fn !== "function")
    throw new Error("validate: fn should be function");
  return _wrap({
    size: inner.size,
    encodeStream: (w, value) => {
      let res;
      try {
        res = fn(value);
      } catch (e) {
        throw w.err(e);
      }
      inner.encodeStream(w, res);
    },
    decodeStream: (r) => {
      const res = inner.decodeStream(r);
      try {
        return fn(res);
      } catch (e) {
        throw r.err(e);
      }
    }
  });
}
var wrap = (inner) => {
  const res = _wrap(inner);
  return inner.validate ? validate(res, inner.validate) : res;
};
var isBaseCoder = (elm) => isPlainObject(elm) && typeof elm.decode === "function" && typeof elm.encode === "function";
function isCoder(elm) {
  return isPlainObject(elm) && isBaseCoder(elm) && typeof elm.encodeStream === "function" && typeof elm.decodeStream === "function" && (elm.size === void 0 || isNum(elm.size));
}
function dict() {
  return {
    encode: (from) => {
      if (!Array.isArray(from))
        throw new Error("array expected");
      const to = {};
      for (const item of from) {
        if (!Array.isArray(item) || item.length !== 2)
          throw new Error(`array of two elements expected`);
        const name = item[0];
        const value = item[1];
        if (to[name] !== void 0)
          throw new Error(`key(${name}) appears twice in struct`);
        to[name] = value;
      }
      return to;
    },
    decode: (to) => {
      if (!isPlainObject(to))
        throw new Error(`expected plain object, got ${to}`);
      return Object.entries(to);
    }
  };
}
var numberBigint = {
  encode: (from) => {
    if (typeof from !== "bigint")
      throw new Error(`expected bigint, got ${typeof from}`);
    if (from > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${from}`);
    return Number(from);
  },
  decode: (to) => {
    if (!isNum(to))
      throw new Error("element is not a safe integer");
    return BigInt(to);
  }
};
function tsEnum(e) {
  if (!isPlainObject(e))
    throw new Error("plain object expected");
  return {
    encode: (from) => {
      if (!isNum(from) || !(from in e))
        throw new Error(`wrong value ${from}`);
      return e[from];
    },
    decode: (to) => {
      if (typeof to !== "string")
        throw new Error(`wrong value ${typeof to}`);
      return e[to];
    }
  };
}
function decimal(precision, round = false) {
  if (!isNum(precision))
    throw new Error(`decimal/precision: wrong value ${precision}`);
  if (typeof round !== "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof round}`);
  const decimalMask = 10n ** BigInt(precision);
  return {
    encode: (from) => {
      if (typeof from !== "bigint")
        throw new Error(`expected bigint, got ${typeof from}`);
      let s = (from < 0n ? -from : from).toString(10);
      let sep = s.length - precision;
      if (sep < 0) {
        s = s.padStart(s.length - sep, "0");
        sep = 0;
      }
      let i = s.length - 1;
      for (; i >= sep && s[i] === "0"; i--)
        ;
      let int = s.slice(0, sep);
      let frac = s.slice(sep, i + 1);
      if (!int)
        int = "0";
      if (from < 0n)
        int = "-" + int;
      if (!frac)
        return int;
      return `${int}.${frac}`;
    },
    decode: (to) => {
      if (typeof to !== "string")
        throw new Error(`expected string, got ${typeof to}`);
      if (to === "-0")
        throw new Error(`negative zero is not allowed`);
      let neg = false;
      if (to.startsWith("-")) {
        neg = true;
        to = to.slice(1);
      }
      if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(to))
        throw new Error(`wrong string value=${to}`);
      let sep = to.indexOf(".");
      sep = sep === -1 ? to.length : sep;
      const intS = to.slice(0, sep);
      const fracS = to.slice(sep + 1).replace(/0+$/, "");
      const int = BigInt(intS) * decimalMask;
      if (!round && fracS.length > precision) {
        throw new Error(`fractional part cannot be represented with this precision (num=${to}, prec=${precision})`);
      }
      const fracLen = Math.min(fracS.length, precision);
      const frac = BigInt(fracS.slice(0, fracLen)) * 10n ** BigInt(precision - fracLen);
      const value = int + frac;
      return neg ? -value : value;
    }
  };
}
function match(lst) {
  if (!Array.isArray(lst))
    throw new Error(`expected array, got ${typeof lst}`);
  for (const i of lst)
    if (!isBaseCoder(i))
      throw new Error(`wrong base coder ${i}`);
  return {
    encode: (from) => {
      for (const c of lst) {
        const elm = c.encode(from);
        if (elm !== void 0)
          return elm;
      }
      throw new Error(`match/encode: cannot find match in ${from}`);
    },
    decode: (to) => {
      for (const c of lst) {
        const elm = c.decode(to);
        if (elm !== void 0)
          return elm;
      }
      throw new Error(`match/decode: cannot find match in ${to}`);
    }
  };
}
var reverse = (coder) => {
  if (!isBaseCoder(coder))
    throw new Error("BaseCoder expected");
  return { encode: coder.decode, decode: coder.encode };
};
var coders = { dict, numberBigint, tsEnum, decimal, match, reverse };
var bigint = (size, le = false, signed = false, sized = true) => {
  if (!isNum(size))
    throw new Error(`bigint/size: wrong value ${size}`);
  if (typeof le !== "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof le}`);
  if (typeof signed !== "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof signed}`);
  if (typeof sized !== "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof sized}`);
  const bLen = BigInt(size);
  const signBit = 2n ** (8n * bLen - 1n);
  return wrap({
    size: sized ? size : void 0,
    encodeStream: (w, value) => {
      if (signed && value < 0)
        value = value | signBit;
      const b = [];
      for (let i = 0; i < size; i++) {
        b.push(Number(value & 255n));
        value >>= 8n;
      }
      let res = new Uint8Array(b).reverse();
      if (!sized) {
        let pos = 0;
        for (pos = 0; pos < res.length; pos++)
          if (res[pos] !== 0)
            break;
        res = res.subarray(pos);
      }
      w.bytes(le ? res.reverse() : res);
    },
    decodeStream: (r) => {
      const value = r.bytes(sized ? size : Math.min(size, r.leftBytes));
      const b = le ? value : swapEndianness(value);
      let res = 0n;
      for (let i = 0; i < b.length; i++)
        res |= BigInt(b[i]) << 8n * BigInt(i);
      if (signed && res & signBit)
        res = (res ^ signBit) - signBit;
      return res;
    },
    validate: (value) => {
      if (typeof value !== "bigint")
        throw new Error(`bigint: invalid value: ${value}`);
      checkBounds(value, 8n * bLen, !!signed);
      return value;
    }
  });
};
var U256LE = bigint(32, true);
var U256BE = bigint(32, false);
var I256LE = bigint(32, true, true);
var I256BE = bigint(32, false, true);
var U128LE = bigint(16, true);
var U128BE = bigint(16, false);
var I128LE = bigint(16, true, true);
var I128BE = bigint(16, false, true);
var U64LE = bigint(8, true);
var U64BE = bigint(8, false);
var I64LE = bigint(8, true, true);
var I64BE = bigint(8, false, true);
var view = (len, opts) => wrap({
  size: len,
  encodeStream: (w, value) => w.writeView(len, (view2) => opts.write(view2, value)),
  decodeStream: (r) => r.readView(len, opts.read),
  validate: (value) => {
    if (typeof value !== "number")
      throw new Error(`viewCoder: expected number, got ${typeof value}`);
    if (opts.validate)
      opts.validate(value);
    return value;
  }
});
var intView = (len, signed, opts) => {
  const bits = len * 8;
  const signBit = 2 ** (bits - 1);
  const validateSigned = (value) => {
    if (!isNum(value))
      throw new Error(`sintView: value is not safe integer: ${value}`);
    if (value < -signBit || value >= signBit) {
      throw new Error(`sintView: value out of bounds. Expected ${-signBit} <= ${value} < ${signBit}`);
    }
  };
  const maxVal = 2 ** bits;
  const validateUnsigned = (value) => {
    if (!isNum(value))
      throw new Error(`uintView: value is not safe integer: ${value}`);
    if (0 > value || value >= maxVal) {
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${value} < ${maxVal}`);
    }
  };
  return view(len, {
    write: opts.write,
    read: opts.read,
    validate: signed ? validateSigned : validateUnsigned
  });
};
var U32LE = intView(4, false, {
  read: (view2, pos) => view2.getUint32(pos, true),
  write: (view2, value) => view2.setUint32(0, value, true)
});
var U32BE = intView(4, false, {
  read: (view2, pos) => view2.getUint32(pos, false),
  write: (view2, value) => view2.setUint32(0, value, false)
});
var I32LE = intView(4, true, {
  read: (view2, pos) => view2.getInt32(pos, true),
  write: (view2, value) => view2.setInt32(0, value, true)
});
var I32BE = intView(4, true, {
  read: (view2, pos) => view2.getInt32(pos, false),
  write: (view2, value) => view2.setInt32(0, value, false)
});
var U16LE = intView(2, false, {
  read: (view2, pos) => view2.getUint16(pos, true),
  write: (view2, value) => view2.setUint16(0, value, true)
});
var U16BE = intView(2, false, {
  read: (view2, pos) => view2.getUint16(pos, false),
  write: (view2, value) => view2.setUint16(0, value, false)
});
var I16LE = intView(2, true, {
  read: (view2, pos) => view2.getInt16(pos, true),
  write: (view2, value) => view2.setInt16(0, value, true)
});
var I16BE = intView(2, true, {
  read: (view2, pos) => view2.getInt16(pos, false),
  write: (view2, value) => view2.setInt16(0, value, false)
});
var U8 = intView(1, false, {
  read: (view2, pos) => view2.getUint8(pos),
  write: (view2, value) => view2.setUint8(0, value)
});
var I8 = intView(1, true, {
  read: (view2, pos) => view2.getInt8(pos),
  write: (view2, value) => view2.setInt8(0, value)
});
var f32 = (le) => view(4, {
  read: (view2, pos) => view2.getFloat32(pos, le),
  write: (view2, value) => view2.setFloat32(0, value, le),
  validate: (value) => {
    if (Math.fround(value) !== value && !Number.isNaN(value))
      throw new Error(`f32: wrong value=${value}`);
  }
});
var f64 = (le) => view(8, {
  read: (view2, pos) => view2.getFloat64(pos, le),
  write: (view2, value) => view2.setFloat64(0, value, le)
});
var F32BE = f32(false);
var F32LE = f32(true);
var F64BE = f64(false);
var F64LE = f64(true);
var bool = wrap({
  size: 1,
  encodeStream: (w, value) => w.byte(value ? 1 : 0),
  decodeStream: (r) => {
    const value = r.byte();
    if (value !== 0 && value !== 1)
      throw r.err(`bool: invalid value ${value}`);
    return value === 1;
  },
  validate: (value) => {
    if (typeof value !== "boolean")
      throw new Error(`bool: invalid value ${value}`);
    return value;
  }
});
var createBytes = (len, le = false) => {
  if (typeof le !== "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof le}`);
  const _length = lengthCoder(len);
  const _isb = isBytes(len);
  return wrap({
    size: typeof len === "number" ? len : void 0,
    encodeStream: (w, value) => {
      if (!_isb)
        _length.encodeStream(w, value.length);
      w.bytes(le ? swapEndianness(value) : value);
      if (_isb)
        w.bytes(len);
    },
    decodeStream: (r) => {
      let bytes;
      if (_isb) {
        const tPos = r.find(len);
        if (!tPos)
          throw r.err(`bytes: cannot find terminator`);
        bytes = r.bytes(tPos - r.pos);
        r.bytes(len.length);
      } else {
        bytes = r.bytes(len === null ? r.leftBytes : _length.decodeStream(r));
      }
      return le ? swapEndianness(bytes) : bytes;
    },
    validate: (value) => {
      if (!isBytes(value))
        throw new Error(`bytes: invalid value ${value}`);
      return value;
    }
  });
};
function prefix(len, inner) {
  if (!isCoder(inner))
    throw new Error(`prefix: invalid inner value ${inner}`);
  return apply(createBytes(len), reverse(inner));
}
var string = (len, le = false) => validate(apply(createBytes(len, le), utf8), (value) => {
  if (typeof value !== "string")
    throw new Error(`expected string, got ${typeof value}`);
  return value;
});
var cstring = string(NULL);
var createHex = (len, options = { isLE: false, with0x: false }) => {
  let inner = apply(createBytes(len, options.isLE), hex);
  const prefix2 = options.with0x;
  if (typeof prefix2 !== "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof prefix2}`);
  if (prefix2) {
    inner = apply(inner, {
      encode: (value) => `0x${value}`,
      decode: (value) => {
        if (!value.startsWith("0x"))
          throw new Error("hex(with0x=true).encode input should start with 0x");
        return value.slice(2);
      }
    });
  }
  return inner;
};
function apply(inner, base) {
  if (!isCoder(inner))
    throw new Error(`apply: invalid inner value ${inner}`);
  if (!isBaseCoder(base))
    throw new Error(`apply: invalid base value ${inner}`);
  return wrap({
    size: inner.size,
    encodeStream: (w, value) => {
      let innerValue;
      try {
        innerValue = base.decode(value);
      } catch (e) {
        throw w.err("" + e);
      }
      return inner.encodeStream(w, innerValue);
    },
    decodeStream: (r) => {
      const innerValue = inner.decodeStream(r);
      try {
        return base.encode(innerValue);
      } catch (e) {
        throw r.err("" + e);
      }
    }
  });
}
var flag = (flagValue, xor = false) => {
  if (!isBytes(flagValue))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof flagValue}`);
  if (typeof xor !== "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof xor}`);
  return wrap({
    size: flagValue.length,
    encodeStream: (w, value) => {
      if (!!value !== xor)
        w.bytes(flagValue);
    },
    decodeStream: (r) => {
      let hasFlag = r.leftBytes >= flagValue.length;
      if (hasFlag) {
        hasFlag = equalBytes(r.bytes(flagValue.length, true), flagValue);
        if (hasFlag)
          r.bytes(flagValue.length);
      }
      return hasFlag !== xor;
    },
    validate: (value) => {
      if (value !== void 0 && typeof value !== "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof value}`);
      return value;
    }
  });
};
function flagged(path, inner, def2) {
  if (!isCoder(inner))
    throw new Error(`flagged: invalid inner value ${inner}`);
  if (typeof path !== "string" && !isCoder(inner))
    throw new Error(`flagged: wrong path=${path}`);
  return wrap({
    encodeStream: (w, value) => {
      if (typeof path === "string") {
        if (Path.resolve(w.stack, path))
          inner.encodeStream(w, value);
        else if (def2)
          inner.encodeStream(w, def2);
      } else {
        path.encodeStream(w, !!value);
        if (!!value)
          inner.encodeStream(w, value);
        else if (def2)
          inner.encodeStream(w, def2);
      }
    },
    decodeStream: (r) => {
      let hasFlag = false;
      if (typeof path === "string")
        hasFlag = !!Path.resolve(r.stack, path);
      else
        hasFlag = path.decodeStream(r);
      if (hasFlag)
        return inner.decodeStream(r);
      else if (def2)
        inner.decodeStream(r);
      return;
    }
  });
}
function magic(inner, constant, check = true) {
  if (!isCoder(inner))
    throw new Error(`magic: invalid inner value ${inner}`);
  if (typeof check !== "boolean")
    throw new Error(`magic: expected boolean, got ${typeof check}`);
  return wrap({
    size: inner.size,
    encodeStream: (w, _value) => inner.encodeStream(w, constant),
    decodeStream: (r) => {
      const value = inner.decodeStream(r);
      if (check && typeof value !== "object" && value !== constant || isBytes(constant) && !equalBytes(constant, value)) {
        throw r.err(`magic: invalid value: ${value} !== ${constant}`);
      }
      return;
    },
    validate: (value) => {
      if (value !== void 0)
        throw new Error(`magic: wrong value=${typeof value}`);
      return value;
    }
  });
}
function sizeof(fields) {
  let size = 0;
  for (const f of fields) {
    if (f.size === void 0)
      return;
    if (!isNum(f.size))
      throw new Error(`sizeof: wrong element size=${size}`);
    size += f.size;
  }
  return size;
}
function struct(fields) {
  if (!isPlainObject(fields))
    throw new Error(`struct: expected plain object, got ${fields}`);
  for (const name in fields) {
    if (!isCoder(fields[name]))
      throw new Error(`struct: field ${name} is not CoderType`);
  }
  return wrap({
    size: sizeof(Object.values(fields)),
    encodeStream: (w, value) => {
      w.pushObj(value, (fieldFn) => {
        for (const name in fields)
          fieldFn(name, () => fields[name].encodeStream(w, value[name]));
      });
    },
    decodeStream: (r) => {
      const res = {};
      r.pushObj(res, (fieldFn) => {
        for (const name in fields)
          fieldFn(name, () => res[name] = fields[name].decodeStream(r));
      });
      return res;
    },
    validate: (value) => {
      if (typeof value !== "object" || value === null)
        throw new Error(`struct: invalid value ${value}`);
      return value;
    }
  });
}
function tuple(fields) {
  if (!Array.isArray(fields))
    throw new Error(`Packed.Tuple: got ${typeof fields} instead of array`);
  for (let i = 0; i < fields.length; i++) {
    if (!isCoder(fields[i]))
      throw new Error(`tuple: field ${i} is not CoderType`);
  }
  return wrap({
    size: sizeof(fields),
    encodeStream: (w, value) => {
      if (!Array.isArray(value))
        throw w.err(`tuple: invalid value ${value}`);
      w.pushObj(value, (fieldFn) => {
        for (let i = 0; i < fields.length; i++)
          fieldFn(`${i}`, () => fields[i].encodeStream(w, value[i]));
      });
    },
    decodeStream: (r) => {
      const res = [];
      r.pushObj(res, (fieldFn) => {
        for (let i = 0; i < fields.length; i++)
          fieldFn(`${i}`, () => res.push(fields[i].decodeStream(r)));
      });
      return res;
    },
    validate: (value) => {
      if (!Array.isArray(value))
        throw new Error(`tuple: invalid value ${value}`);
      if (value.length !== fields.length)
        throw new Error(`tuple: wrong length=${value.length}, expected ${fields.length}`);
      return value;
    }
  });
}
function array(len, inner) {
  if (!isCoder(inner))
    throw new Error(`array: invalid inner value ${inner}`);
  const _length = lengthCoder(typeof len === "string" ? `../${len}` : len);
  return wrap({
    size: typeof len === "number" && inner.size ? len * inner.size : void 0,
    encodeStream: (w, value) => {
      const _w = w;
      _w.pushObj(value, (fieldFn) => {
        if (!isBytes(len))
          _length.encodeStream(w, value.length);
        for (let i = 0; i < value.length; i++) {
          fieldFn(`${i}`, () => {
            const elm = value[i];
            const startPos = w.pos;
            inner.encodeStream(w, elm);
            if (isBytes(len)) {
              if (len.length > _w.pos - startPos)
                return;
              const data = _w.finish(false).subarray(startPos, _w.pos);
              if (equalBytes(data.subarray(0, len.length), len))
                throw _w.err(`array: inner element encoding same as separator. elm=${elm} data=${data}`);
            }
          });
        }
      });
      if (isBytes(len))
        w.bytes(len);
    },
    decodeStream: (r) => {
      const res = [];
      r.pushObj(res, (fieldFn) => {
        if (len === null) {
          for (let i = 0; !r.isEnd(); i++) {
            fieldFn(`${i}`, () => res.push(inner.decodeStream(r)));
            if (inner.size && r.leftBytes < inner.size)
              break;
          }
        } else if (isBytes(len)) {
          for (let i = 0; ; i++) {
            if (equalBytes(r.bytes(len.length, true), len)) {
              r.bytes(len.length);
              break;
            }
            fieldFn(`${i}`, () => res.push(inner.decodeStream(r)));
          }
        } else {
          let length;
          fieldFn("arrayLen", () => length = _length.decodeStream(r));
          for (let i = 0; i < length; i++)
            fieldFn(`${i}`, () => res.push(inner.decodeStream(r)));
        }
      });
      return res;
    },
    validate: (value) => {
      if (!Array.isArray(value))
        throw new Error(`array: invalid value ${value}`);
      return value;
    }
  });
}

// node_modules/@scure/btc-signer/esm/utils.js
var Point = secp256k1.ProjectivePoint;
var CURVE_ORDER = secp256k1.CURVE.n;
var isBytes2 = utils.isBytes;
var concatBytes2 = utils.concatBytes;
var equalBytes2 = utils.equalBytes;
var hash160 = (msg) => ripemd160(sha256(msg));
var sha256x2 = (...msgs) => sha256(sha256(concatBytes2(...msgs)));
var randomPrivateKeyBytes = schnorr.utils.randomPrivateKey;
var pubSchnorr = schnorr.getPublicKey;
var pubECDSA = secp256k1.getPublicKey;
var hasLowR = (sig) => sig.r < CURVE_ORDER / 2n;
function signECDSA(hash, privateKey, lowR = false) {
  let sig = secp256k1.sign(hash, privateKey);
  if (lowR && !hasLowR(sig)) {
    const extraEntropy = new Uint8Array(32);
    let counter = 0;
    while (!hasLowR(sig)) {
      extraEntropy.set(U32LE.encode(counter++));
      sig = secp256k1.sign(hash, privateKey, { extraEntropy });
      if (counter > 4294967295)
        throw new Error("lowR counter overflow: report the error");
    }
  }
  return sig.toDERRawBytes();
}
var signSchnorr = schnorr.sign;
var tagSchnorr = schnorr.utils.taggedHash;
var PubT;
(function(PubT2) {
  PubT2[PubT2["ecdsa"] = 0] = "ecdsa";
  PubT2[PubT2["schnorr"] = 1] = "schnorr";
})(PubT || (PubT = {}));
function validatePubkey(pub, type) {
  const len = pub.length;
  if (type === PubT.ecdsa) {
    if (len === 32)
      throw new Error("Expected non-Schnorr key");
    Point.fromHex(pub);
    return pub;
  } else if (type === PubT.schnorr) {
    if (len !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    schnorr.utils.lift_x(schnorr.utils.bytesToNumberBE(pub));
    return pub;
  } else {
    throw new Error("Unknown key type");
  }
}
function tapTweak(a, b) {
  const u = schnorr.utils;
  const t = u.taggedHash("TapTweak", a, b);
  const tn = u.bytesToNumberBE(t);
  if (tn >= CURVE_ORDER)
    throw new Error("tweak higher than curve order");
  return tn;
}
function taprootTweakPrivKey(privKey, merkleRoot = Uint8Array.of()) {
  const u = schnorr.utils;
  const seckey0 = u.bytesToNumberBE(privKey);
  const P = Point.fromPrivateKey(seckey0);
  const seckey = P.hasEvenY() ? seckey0 : u.mod(-seckey0, CURVE_ORDER);
  const xP = u.pointToBytes(P);
  const t = tapTweak(xP, merkleRoot);
  return u.numberToBytesBE(u.mod(seckey + t, CURVE_ORDER), 32);
}
function taprootTweakPubkey(pubKey, h) {
  const u = schnorr.utils;
  const t = tapTweak(pubKey, h);
  const P = u.lift_x(u.bytesToNumberBE(pubKey));
  const Q = P.add(Point.fromPrivateKey(t));
  const parity = Q.hasEvenY() ? 0 : 1;
  return [u.pointToBytes(Q), parity];
}
var TAPROOT_UNSPENDABLE_KEY = sha256(Point.BASE.toRawBytes(false));
var NETWORK = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
};
var TEST_NETWORK = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function compareBytes(a, b) {
  if (!isBytes2(a) || !isBytes2(b))
    throw new Error(`cmp: wrong type a=${typeof a} b=${typeof b}`);
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++)
    if (a[i] != b[i])
      return Math.sign(a[i] - b[i]);
  return Math.sign(a.length - b.length);
}

// node_modules/@scure/btc-signer/esm/script.js
var MAX_SCRIPT_BYTE_LENGTH = 520;
var OP;
(function(OP2) {
  OP2[OP2["OP_0"] = 0] = "OP_0";
  OP2[OP2["PUSHDATA1"] = 76] = "PUSHDATA1";
  OP2[OP2["PUSHDATA2"] = 77] = "PUSHDATA2";
  OP2[OP2["PUSHDATA4"] = 78] = "PUSHDATA4";
  OP2[OP2["1NEGATE"] = 79] = "1NEGATE";
  OP2[OP2["RESERVED"] = 80] = "RESERVED";
  OP2[OP2["OP_1"] = 81] = "OP_1";
  OP2[OP2["OP_2"] = 82] = "OP_2";
  OP2[OP2["OP_3"] = 83] = "OP_3";
  OP2[OP2["OP_4"] = 84] = "OP_4";
  OP2[OP2["OP_5"] = 85] = "OP_5";
  OP2[OP2["OP_6"] = 86] = "OP_6";
  OP2[OP2["OP_7"] = 87] = "OP_7";
  OP2[OP2["OP_8"] = 88] = "OP_8";
  OP2[OP2["OP_9"] = 89] = "OP_9";
  OP2[OP2["OP_10"] = 90] = "OP_10";
  OP2[OP2["OP_11"] = 91] = "OP_11";
  OP2[OP2["OP_12"] = 92] = "OP_12";
  OP2[OP2["OP_13"] = 93] = "OP_13";
  OP2[OP2["OP_14"] = 94] = "OP_14";
  OP2[OP2["OP_15"] = 95] = "OP_15";
  OP2[OP2["OP_16"] = 96] = "OP_16";
  OP2[OP2["NOP"] = 97] = "NOP";
  OP2[OP2["VER"] = 98] = "VER";
  OP2[OP2["IF"] = 99] = "IF";
  OP2[OP2["NOTIF"] = 100] = "NOTIF";
  OP2[OP2["VERIF"] = 101] = "VERIF";
  OP2[OP2["VERNOTIF"] = 102] = "VERNOTIF";
  OP2[OP2["ELSE"] = 103] = "ELSE";
  OP2[OP2["ENDIF"] = 104] = "ENDIF";
  OP2[OP2["VERIFY"] = 105] = "VERIFY";
  OP2[OP2["RETURN"] = 106] = "RETURN";
  OP2[OP2["TOALTSTACK"] = 107] = "TOALTSTACK";
  OP2[OP2["FROMALTSTACK"] = 108] = "FROMALTSTACK";
  OP2[OP2["2DROP"] = 109] = "2DROP";
  OP2[OP2["2DUP"] = 110] = "2DUP";
  OP2[OP2["3DUP"] = 111] = "3DUP";
  OP2[OP2["2OVER"] = 112] = "2OVER";
  OP2[OP2["2ROT"] = 113] = "2ROT";
  OP2[OP2["2SWAP"] = 114] = "2SWAP";
  OP2[OP2["IFDUP"] = 115] = "IFDUP";
  OP2[OP2["DEPTH"] = 116] = "DEPTH";
  OP2[OP2["DROP"] = 117] = "DROP";
  OP2[OP2["DUP"] = 118] = "DUP";
  OP2[OP2["NIP"] = 119] = "NIP";
  OP2[OP2["OVER"] = 120] = "OVER";
  OP2[OP2["PICK"] = 121] = "PICK";
  OP2[OP2["ROLL"] = 122] = "ROLL";
  OP2[OP2["ROT"] = 123] = "ROT";
  OP2[OP2["SWAP"] = 124] = "SWAP";
  OP2[OP2["TUCK"] = 125] = "TUCK";
  OP2[OP2["CAT"] = 126] = "CAT";
  OP2[OP2["SUBSTR"] = 127] = "SUBSTR";
  OP2[OP2["LEFT"] = 128] = "LEFT";
  OP2[OP2["RIGHT"] = 129] = "RIGHT";
  OP2[OP2["SIZE"] = 130] = "SIZE";
  OP2[OP2["INVERT"] = 131] = "INVERT";
  OP2[OP2["AND"] = 132] = "AND";
  OP2[OP2["OR"] = 133] = "OR";
  OP2[OP2["XOR"] = 134] = "XOR";
  OP2[OP2["EQUAL"] = 135] = "EQUAL";
  OP2[OP2["EQUALVERIFY"] = 136] = "EQUALVERIFY";
  OP2[OP2["RESERVED1"] = 137] = "RESERVED1";
  OP2[OP2["RESERVED2"] = 138] = "RESERVED2";
  OP2[OP2["1ADD"] = 139] = "1ADD";
  OP2[OP2["1SUB"] = 140] = "1SUB";
  OP2[OP2["2MUL"] = 141] = "2MUL";
  OP2[OP2["2DIV"] = 142] = "2DIV";
  OP2[OP2["NEGATE"] = 143] = "NEGATE";
  OP2[OP2["ABS"] = 144] = "ABS";
  OP2[OP2["NOT"] = 145] = "NOT";
  OP2[OP2["0NOTEQUAL"] = 146] = "0NOTEQUAL";
  OP2[OP2["ADD"] = 147] = "ADD";
  OP2[OP2["SUB"] = 148] = "SUB";
  OP2[OP2["MUL"] = 149] = "MUL";
  OP2[OP2["DIV"] = 150] = "DIV";
  OP2[OP2["MOD"] = 151] = "MOD";
  OP2[OP2["LSHIFT"] = 152] = "LSHIFT";
  OP2[OP2["RSHIFT"] = 153] = "RSHIFT";
  OP2[OP2["BOOLAND"] = 154] = "BOOLAND";
  OP2[OP2["BOOLOR"] = 155] = "BOOLOR";
  OP2[OP2["NUMEQUAL"] = 156] = "NUMEQUAL";
  OP2[OP2["NUMEQUALVERIFY"] = 157] = "NUMEQUALVERIFY";
  OP2[OP2["NUMNOTEQUAL"] = 158] = "NUMNOTEQUAL";
  OP2[OP2["LESSTHAN"] = 159] = "LESSTHAN";
  OP2[OP2["GREATERTHAN"] = 160] = "GREATERTHAN";
  OP2[OP2["LESSTHANOREQUAL"] = 161] = "LESSTHANOREQUAL";
  OP2[OP2["GREATERTHANOREQUAL"] = 162] = "GREATERTHANOREQUAL";
  OP2[OP2["MIN"] = 163] = "MIN";
  OP2[OP2["MAX"] = 164] = "MAX";
  OP2[OP2["WITHIN"] = 165] = "WITHIN";
  OP2[OP2["RIPEMD160"] = 166] = "RIPEMD160";
  OP2[OP2["SHA1"] = 167] = "SHA1";
  OP2[OP2["SHA256"] = 168] = "SHA256";
  OP2[OP2["HASH160"] = 169] = "HASH160";
  OP2[OP2["HASH256"] = 170] = "HASH256";
  OP2[OP2["CODESEPARATOR"] = 171] = "CODESEPARATOR";
  OP2[OP2["CHECKSIG"] = 172] = "CHECKSIG";
  OP2[OP2["CHECKSIGVERIFY"] = 173] = "CHECKSIGVERIFY";
  OP2[OP2["CHECKMULTISIG"] = 174] = "CHECKMULTISIG";
  OP2[OP2["CHECKMULTISIGVERIFY"] = 175] = "CHECKMULTISIGVERIFY";
  OP2[OP2["NOP1"] = 176] = "NOP1";
  OP2[OP2["CHECKLOCKTIMEVERIFY"] = 177] = "CHECKLOCKTIMEVERIFY";
  OP2[OP2["CHECKSEQUENCEVERIFY"] = 178] = "CHECKSEQUENCEVERIFY";
  OP2[OP2["NOP4"] = 179] = "NOP4";
  OP2[OP2["NOP5"] = 180] = "NOP5";
  OP2[OP2["NOP6"] = 181] = "NOP6";
  OP2[OP2["NOP7"] = 182] = "NOP7";
  OP2[OP2["NOP8"] = 183] = "NOP8";
  OP2[OP2["NOP9"] = 184] = "NOP9";
  OP2[OP2["NOP10"] = 185] = "NOP10";
  OP2[OP2["CHECKSIGADD"] = 186] = "CHECKSIGADD";
  OP2[OP2["INVALID"] = 255] = "INVALID";
})(OP || (OP = {}));
function ScriptNum(bytesLimit = 6, forceMinimal = false) {
  return wrap({
    encodeStream: (w, value) => {
      if (value === 0n)
        return;
      const neg = value < 0;
      const val = BigInt(value);
      const nums = [];
      for (let abs = neg ? -val : val; abs; abs >>= 8n)
        nums.push(Number(abs & 0xffn));
      if (nums[nums.length - 1] >= 128)
        nums.push(neg ? 128 : 0);
      else if (neg)
        nums[nums.length - 1] |= 128;
      w.bytes(new Uint8Array(nums));
    },
    decodeStream: (r) => {
      const len = r.leftBytes;
      if (len > bytesLimit)
        throw new Error(`ScriptNum: number (${len}) bigger than limit=${bytesLimit}`);
      if (len === 0)
        return 0n;
      if (forceMinimal) {
        const data = r.bytes(len, true);
        if ((data[data.length - 1] & 127) === 0) {
          if (len <= 1 || (data[data.length - 2] & 128) === 0)
            throw new Error("Non-minimally encoded ScriptNum");
        }
      }
      let last = 0;
      let res = 0n;
      for (let i = 0; i < len; ++i) {
        last = r.byte();
        res |= BigInt(last) << 8n * BigInt(i);
      }
      if (last >= 128) {
        res &= 2n ** BigInt(len * 8) - 1n >> 1n;
        res = -res;
      }
      return res;
    }
  });
}
function OpToNum(op, bytesLimit = 4, forceMinimal = true) {
  if (typeof op === "number")
    return op;
  if (isBytes2(op)) {
    try {
      const val = ScriptNum(bytesLimit, forceMinimal).decode(op);
      if (val > Number.MAX_SAFE_INTEGER)
        return;
      return Number(val);
    } catch (e) {
      return;
    }
  }
  return;
}
var Script = wrap({
  encodeStream: (w, value) => {
    for (let o of value) {
      if (typeof o === "string") {
        if (OP[o] === void 0)
          throw new Error(`Unknown opcode=${o}`);
        w.byte(OP[o]);
        continue;
      } else if (typeof o === "number") {
        if (o === 0) {
          w.byte(0);
          continue;
        } else if (1 <= o && o <= 16) {
          w.byte(OP.OP_1 - 1 + o);
          continue;
        }
      }
      if (typeof o === "number")
        o = ScriptNum().encode(BigInt(o));
      if (!isBytes2(o))
        throw new Error(`Wrong Script OP=${o} (${typeof o})`);
      const len = o.length;
      if (len < OP.PUSHDATA1)
        w.byte(len);
      else if (len <= 255) {
        w.byte(OP.PUSHDATA1);
        w.byte(len);
      } else if (len <= 65535) {
        w.byte(OP.PUSHDATA2);
        w.bytes(U16LE.encode(len));
      } else {
        w.byte(OP.PUSHDATA4);
        w.bytes(U32LE.encode(len));
      }
      w.bytes(o);
    }
  },
  decodeStream: (r) => {
    const out = [];
    while (!r.isEnd()) {
      const cur = r.byte();
      if (OP.OP_0 < cur && cur <= OP.PUSHDATA4) {
        let len;
        if (cur < OP.PUSHDATA1)
          len = cur;
        else if (cur === OP.PUSHDATA1)
          len = U8.decodeStream(r);
        else if (cur === OP.PUSHDATA2)
          len = U16LE.decodeStream(r);
        else if (cur === OP.PUSHDATA4)
          len = U32LE.decodeStream(r);
        else
          throw new Error("Should be not possible");
        out.push(r.bytes(len));
      } else if (cur === 0) {
        out.push(0);
      } else if (OP.OP_1 <= cur && cur <= OP.OP_16) {
        out.push(cur - (OP.OP_1 - 1));
      } else {
        const op = OP[cur];
        if (op === void 0)
          throw new Error(`Unknown opcode=${cur.toString(16)}`);
        out.push(op);
      }
    }
    return out;
  }
});
var CSLimits = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
};
var CompactSize = wrap({
  encodeStream: (w, value) => {
    if (typeof value === "number")
      value = BigInt(value);
    if (0n <= value && value <= 252n)
      return w.byte(Number(value));
    for (const [flag2, bytes, start, stop] of Object.values(CSLimits)) {
      if (start > value || value > stop)
        continue;
      w.byte(flag2);
      for (let i = 0; i < bytes; i++)
        w.byte(Number(value >> 8n * BigInt(i) & 0xffn));
      return;
    }
    throw w.err(`VarInt too big: ${value}`);
  },
  decodeStream: (r) => {
    const b0 = r.byte();
    if (b0 <= 252)
      return BigInt(b0);
    const [_, bytes, start] = CSLimits[b0];
    let num = 0n;
    for (let i = 0; i < bytes; i++)
      num |= BigInt(r.byte()) << 8n * BigInt(i);
    if (num < start)
      throw r.err(`Wrong CompactSize(${8 * bytes})`);
    return num;
  }
});
var CompactSizeLen = apply(CompactSize, coders.numberBigint);
var VarBytes = createBytes(CompactSize);
var RawWitness = array(CompactSizeLen, VarBytes);
var BTCArray = (t) => array(CompactSize, t);
var RawInput = struct({
  txid: createBytes(32, true),
  // hash(prev_tx),
  index: U32LE,
  // output number of previous tx
  finalScriptSig: VarBytes,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: U32LE
  // ?
});
var RawOutput = struct({ amount: U64LE, script: VarBytes });
var _RawTx = struct({
  version: I32LE,
  segwitFlag: flag(new Uint8Array([0, 1])),
  inputs: BTCArray(RawInput),
  outputs: BTCArray(RawOutput),
  witnesses: flagged("segwitFlag", array("inputs/length", RawWitness)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: U32LE
});
function validateRawTx(tx) {
  if (tx.segwitFlag && tx.witnesses && !tx.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return tx;
}
var RawTx = validate(_RawTx, validateRawTx);
var RawOldTx = struct({
  version: I32LE,
  inputs: BTCArray(RawInput),
  outputs: BTCArray(RawOutput),
  lockTime: U32LE
});

// node_modules/@scure/btc-signer/esm/psbt.js
var PubKeyECDSA = validate(createBytes(null), (pub) => validatePubkey(pub, PubT.ecdsa));
var PubKeySchnorr = validate(createBytes(32), (pub) => validatePubkey(pub, PubT.schnorr));
var SignatureSchnorr = validate(createBytes(null), (sig) => {
  if (sig.length !== 64 && sig.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return sig;
});
var BIP32Der = struct({
  fingerprint: U32BE,
  path: array(null, U32LE)
});
var TaprootBIP32Der = struct({
  hashes: array(CompactSizeLen, createBytes(32)),
  der: BIP32Der
});
var GlobalXPUB = createBytes(78);
var tapScriptSigKey = struct({ pubKey: PubKeySchnorr, leafHash: createBytes(32) });
var _TaprootControlBlock = struct({
  version: U8,
  // With parity :(
  internalKey: createBytes(32),
  merklePath: array(null, createBytes(32))
});
var TaprootControlBlock = validate(_TaprootControlBlock, (cb) => {
  if (cb.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return cb;
});
var tapTree = array(null, struct({
  depth: U8,
  version: U8,
  script: VarBytes
}));
var BytesInf = createBytes(null);
var Bytes20 = createBytes(20);
var Bytes32 = createBytes(32);
var PSBTGlobal = {
  unsignedTx: [0, false, RawOldTx, [0], [0], false],
  xpub: [1, GlobalXPUB, BIP32Der, [], [0, 2], false],
  txVersion: [2, false, U32LE, [2], [2], false],
  fallbackLocktime: [3, false, U32LE, [], [2], false],
  inputCount: [4, false, CompactSizeLen, [2], [2], false],
  outputCount: [5, false, CompactSizeLen, [2], [2], false],
  txModifiable: [6, false, U8, [], [2], false],
  // TODO: bitfield
  version: [251, false, U32LE, [], [0, 2], false],
  proprietary: [252, BytesInf, BytesInf, [], [0, 2], false]
};
var PSBTInput = {
  nonWitnessUtxo: [0, false, RawTx, [], [0, 2], false],
  witnessUtxo: [1, false, RawOutput, [], [0, 2], false],
  partialSig: [2, PubKeyECDSA, BytesInf, [], [0, 2], false],
  sighashType: [3, false, U32LE, [], [0, 2], false],
  redeemScript: [4, false, BytesInf, [], [0, 2], false],
  witnessScript: [5, false, BytesInf, [], [0, 2], false],
  bip32Derivation: [6, PubKeyECDSA, BIP32Der, [], [0, 2], false],
  finalScriptSig: [7, false, BytesInf, [], [0, 2], false],
  finalScriptWitness: [8, false, RawWitness, [], [0, 2], false],
  porCommitment: [9, false, BytesInf, [], [0, 2], false],
  ripemd160: [10, Bytes20, BytesInf, [], [0, 2], false],
  sha256: [11, Bytes32, BytesInf, [], [0, 2], false],
  hash160: [12, Bytes20, BytesInf, [], [0, 2], false],
  hash256: [13, Bytes32, BytesInf, [], [0, 2], false],
  txid: [14, false, Bytes32, [2], [2], true],
  index: [15, false, U32LE, [2], [2], true],
  sequence: [16, false, U32LE, [], [2], true],
  requiredTimeLocktime: [17, false, U32LE, [], [2], false],
  requiredHeightLocktime: [18, false, U32LE, [], [2], false],
  tapKeySig: [19, false, SignatureSchnorr, [], [0, 2], false],
  tapScriptSig: [20, tapScriptSigKey, SignatureSchnorr, [], [0, 2], false],
  tapLeafScript: [21, TaprootControlBlock, BytesInf, [], [0, 2], false],
  tapBip32Derivation: [22, Bytes32, TaprootBIP32Der, [], [0, 2], false],
  tapInternalKey: [23, false, PubKeySchnorr, [], [0, 2], false],
  tapMerkleRoot: [24, false, Bytes32, [], [0, 2], false],
  proprietary: [252, BytesInf, BytesInf, [], [0, 2], false]
};
var PSBTInputFinalKeys = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
];
var PSBTInputUnsignedKeys = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
];
var PSBTOutput = {
  redeemScript: [0, false, BytesInf, [], [0, 2], false],
  witnessScript: [1, false, BytesInf, [], [0, 2], false],
  bip32Derivation: [2, PubKeyECDSA, BIP32Der, [], [0, 2], false],
  amount: [3, false, I64LE, [2], [2], true],
  script: [4, false, BytesInf, [2], [2], true],
  tapInternalKey: [5, false, PubKeySchnorr, [], [0, 2], false],
  tapTree: [6, false, tapTree, [], [0, 2], false],
  tapBip32Derivation: [7, PubKeySchnorr, TaprootBIP32Der, [], [0, 2], false],
  proprietary: [252, BytesInf, BytesInf, [], [0, 2], false]
};
var PSBTOutputUnsignedKeys = [];
var PSBTKeyPair = array(NULL, struct({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: prefix(CompactSizeLen, struct({ type: CompactSizeLen, key: createBytes(null) })),
  //  <value> := <valuelen> <valuedata>
  value: createBytes(CompactSizeLen)
}));
function PSBTKeyInfo(info) {
  const [type, kc, vc, reqInc, allowInc, silentIgnore] = info;
  return { type, kc, vc, reqInc, allowInc, silentIgnore };
}
var PSBTUnknownKey = struct({ type: CompactSizeLen, key: createBytes(null) });
function PSBTKeyMap(psbtEnum) {
  const byType = {};
  for (const k in psbtEnum) {
    const [num, kc, vc] = psbtEnum[k];
    byType[num] = [k, kc, vc];
  }
  return wrap({
    encodeStream: (w, value) => {
      let out = [];
      for (const name in psbtEnum) {
        const val = value[name];
        if (val === void 0)
          continue;
        const [type, kc, vc] = psbtEnum[name];
        if (!kc) {
          out.push({ key: { type, key: EMPTY }, value: vc.encode(val) });
        } else {
          const kv = val.map(([k, v]) => [
            kc.encode(k),
            vc.encode(v)
          ]);
          kv.sort((a, b) => compareBytes(a[0], b[0]));
          for (const [key, value2] of kv)
            out.push({ key: { key, type }, value: value2 });
        }
      }
      if (value.unknown) {
        value.unknown.sort((a, b) => compareBytes(a[0].key, b[0].key));
        for (const [k, v] of value.unknown)
          out.push({ key: k, value: v });
      }
      PSBTKeyPair.encodeStream(w, out);
    },
    decodeStream: (r) => {
      const raw = PSBTKeyPair.decodeStream(r);
      const out = {};
      const noKey = {};
      for (const elm of raw) {
        let name = "unknown";
        let key = elm.key.key;
        let value = elm.value;
        if (byType[elm.key.type]) {
          const [_name, kc, vc] = byType[elm.key.type];
          name = _name;
          if (!kc && key.length) {
            throw new Error(`PSBT: Non-empty key for ${name} (key=${hex.encode(key)} value=${hex.encode(value)}`);
          }
          key = kc ? kc.decode(key) : void 0;
          value = vc.decode(value);
          if (!kc) {
            if (out[name])
              throw new Error(`PSBT: Same keys: ${name} (key=${key} value=${value})`);
            out[name] = value;
            noKey[name] = true;
            continue;
          }
        } else {
          key = { type: elm.key.type, key: elm.key.key };
        }
        if (noKey[name])
          throw new Error(`PSBT: Key type with empty key and no key=${name} val=${value}`);
        if (!out[name])
          out[name] = [];
        out[name].push([key, value]);
      }
      return out;
    }
  });
}
var PSBTInputCoder = validate(PSBTKeyMap(PSBTInput), (i) => {
  if (i.finalScriptWitness && !i.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (i.partialSig && !i.partialSig.length)
    throw new Error("Empty partialSig");
  if (i.partialSig)
    for (const [k] of i.partialSig)
      validatePubkey(k, PubT.ecdsa);
  if (i.bip32Derivation)
    for (const [k] of i.bip32Derivation)
      validatePubkey(k, PubT.ecdsa);
  if (i.requiredTimeLocktime !== void 0 && i.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${i.requiredTimeLocktime}`);
  if (i.requiredHeightLocktime !== void 0 && (i.requiredHeightLocktime <= 0 || i.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${i.requiredHeightLocktime}`);
  if (i.tapLeafScript) {
    for (const [k, v] of i.tapLeafScript) {
      if ((k.version & 254) !== v[v.length - 1])
        throw new Error("validateInput: tapLeafScript version mimatch");
      if (v[v.length - 1] & 1)
        throw new Error("validateInput: tapLeafScript version has parity bit!");
    }
  }
  return i;
});
var PSBTOutputCoder = validate(PSBTKeyMap(PSBTOutput), (o) => {
  if (o.bip32Derivation)
    for (const [k] of o.bip32Derivation)
      validatePubkey(k, PubT.ecdsa);
  return o;
});
var PSBTGlobalCoder = validate(PSBTKeyMap(PSBTGlobal), (g) => {
  const version = g.version || 0;
  if (version === 0) {
    if (!g.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const inp of g.unsignedTx.inputs)
      if (inp.finalScriptSig && inp.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return g;
});
var _RawPSBTV0 = struct({
  magic: magic(string(new Uint8Array([255])), "psbt"),
  global: PSBTGlobalCoder,
  inputs: array("global/unsignedTx/inputs/length", PSBTInputCoder),
  outputs: array(null, PSBTOutputCoder)
});
var _RawPSBTV2 = struct({
  magic: magic(string(new Uint8Array([255])), "psbt"),
  global: PSBTGlobalCoder,
  inputs: array("global/inputCount", PSBTInputCoder),
  outputs: array("global/outputCount", PSBTOutputCoder)
});
var _DebugPSBT = struct({
  magic: magic(string(new Uint8Array([255])), "psbt"),
  items: array(null, apply(array(NULL, tuple([createHex(CompactSizeLen), createBytes(CompactSize)])), coders.dict()))
});
function validatePSBTFields(version, info, lst) {
  for (const k in lst) {
    if (k === "unknown")
      continue;
    if (!info[k])
      continue;
    const { allowInc } = PSBTKeyInfo(info[k]);
    if (!allowInc.includes(version))
      throw new Error(`PSBTv${version}: field ${k} is not allowed`);
  }
  for (const k in info) {
    const { reqInc } = PSBTKeyInfo(info[k]);
    if (reqInc.includes(version) && lst[k] === void 0)
      throw new Error(`PSBTv${version}: missing required field ${k}`);
  }
}
function cleanPSBTFields(version, info, lst) {
  const out = {};
  for (const _k in lst) {
    const k = _k;
    if (k !== "unknown") {
      if (!info[k])
        continue;
      const { allowInc, silentIgnore } = PSBTKeyInfo(info[k]);
      if (!allowInc.includes(version)) {
        if (silentIgnore)
          continue;
        throw new Error(`Failed to serialize in PSBTv${version}: ${k} but versions allows inclusion=${allowInc}`);
      }
    }
    out[k] = lst[k];
  }
  return out;
}
function validatePSBT(tx) {
  const version = tx && tx.global && tx.global.version || 0;
  validatePSBTFields(version, PSBTGlobal, tx.global);
  for (const i of tx.inputs)
    validatePSBTFields(version, PSBTInput, i);
  for (const o of tx.outputs)
    validatePSBTFields(version, PSBTOutput, o);
  const inputCount = !version ? tx.global.unsignedTx.inputs.length : tx.global.inputCount;
  if (tx.inputs.length < inputCount)
    throw new Error("Not enough inputs");
  const inputsLeft = tx.inputs.slice(inputCount);
  if (inputsLeft.length > 1 || inputsLeft.length && Object.keys(inputsLeft[0]).length)
    throw new Error(`Unexpected inputs left in tx=${inputsLeft}`);
  const outputCount = !version ? tx.global.unsignedTx.outputs.length : tx.global.outputCount;
  if (tx.outputs.length < outputCount)
    throw new Error("Not outputs inputs");
  const outputsLeft = tx.outputs.slice(outputCount);
  if (outputsLeft.length > 1 || outputsLeft.length && Object.keys(outputsLeft[0]).length)
    throw new Error(`Unexpected outputs left in tx=${outputsLeft}`);
  return tx;
}
function mergeKeyMap(psbtEnum, val, cur, allowedFields, allowUnknown) {
  const res = { ...cur, ...val };
  for (const k in psbtEnum) {
    const key = k;
    const [_, kC, vC] = psbtEnum[key];
    const cannotChange = allowedFields && !allowedFields.includes(k);
    if (val[k] === void 0 && k in val) {
      if (cannotChange)
        throw new Error(`Cannot remove signed field=${k}`);
      delete res[k];
    } else if (kC) {
      const oldKV = cur && cur[k] ? cur[k] : [];
      let newKV = val[key];
      if (newKV) {
        if (!Array.isArray(newKV))
          throw new Error(`keyMap(${k}): KV pairs should be [k, v][]`);
        newKV = newKV.map((val2) => {
          if (val2.length !== 2)
            throw new Error(`keyMap(${k}): KV pairs should be [k, v][]`);
          return [
            typeof val2[0] === "string" ? kC.decode(hex.decode(val2[0])) : val2[0],
            typeof val2[1] === "string" ? vC.decode(hex.decode(val2[1])) : val2[1]
          ];
        });
        const map = {};
        const add = (kStr, k2, v) => {
          if (map[kStr] === void 0) {
            map[kStr] = [k2, v];
            return;
          }
          const oldVal = hex.encode(vC.encode(map[kStr][1]));
          const newVal = hex.encode(vC.encode(v));
          if (oldVal !== newVal)
            throw new Error(`keyMap(${key}): same key=${kStr} oldVal=${oldVal} newVal=${newVal}`);
        };
        for (const [k2, v] of oldKV) {
          const kStr = hex.encode(kC.encode(k2));
          add(kStr, k2, v);
        }
        for (const [k2, v] of newKV) {
          const kStr = hex.encode(kC.encode(k2));
          if (v === void 0) {
            if (cannotChange)
              throw new Error(`Cannot remove signed field=${key}/${k2}`);
            delete map[kStr];
          } else
            add(kStr, k2, v);
        }
        res[key] = Object.values(map);
      }
    } else if (typeof res[k] === "string") {
      res[k] = vC.decode(hex.decode(res[k]));
    } else if (cannotChange && k in val && cur && cur[k] !== void 0) {
      if (!equalBytes2(vC.encode(val[k]), vC.encode(cur[k])))
        throw new Error(`Cannot change signed field=${k}`);
    }
  }
  for (const k in res) {
    if (!psbtEnum[k]) {
      if (allowUnknown && k === "unknown")
        continue;
      delete res[k];
    }
  }
  return res;
}
var RawPSBTV0 = validate(_RawPSBTV0, validatePSBT);
var RawPSBTV2 = validate(_RawPSBTV2, validatePSBT);

// node_modules/@scure/btc-signer/esm/payment.js
var OutP2A = {
  encode(from) {
    if (from.length !== 2 || from[0] !== 1 || !isBytes2(from[1]) || hex.encode(from[1]) !== "4e73")
      return;
    return { type: "p2a", script: Script.encode(from) };
  },
  decode: (to) => {
    if (to.type !== "p2a")
      return;
    return [1, hex.decode("4e73")];
  }
};
function isValidPubkey(pub, type) {
  try {
    validatePubkey(pub, type);
    return true;
  } catch (e) {
    return false;
  }
}
var OutPK = {
  encode(from) {
    if (from.length !== 2 || !isBytes2(from[0]) || !isValidPubkey(from[0], PubT.ecdsa) || from[1] !== "CHECKSIG")
      return;
    return { type: "pk", pubkey: from[0] };
  },
  decode: (to) => to.type === "pk" ? [to.pubkey, "CHECKSIG"] : void 0
};
var OutPKH = {
  encode(from) {
    if (from.length !== 5 || from[0] !== "DUP" || from[1] !== "HASH160" || !isBytes2(from[2]))
      return;
    if (from[3] !== "EQUALVERIFY" || from[4] !== "CHECKSIG")
      return;
    return { type: "pkh", hash: from[2] };
  },
  decode: (to) => to.type === "pkh" ? ["DUP", "HASH160", to.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
};
var OutSH = {
  encode(from) {
    if (from.length !== 3 || from[0] !== "HASH160" || !isBytes2(from[1]) || from[2] !== "EQUAL")
      return;
    return { type: "sh", hash: from[1] };
  },
  decode: (to) => to.type === "sh" ? ["HASH160", to.hash, "EQUAL"] : void 0
};
var OutWSH = {
  encode(from) {
    if (from.length !== 2 || from[0] !== 0 || !isBytes2(from[1]))
      return;
    if (from[1].length !== 32)
      return;
    return { type: "wsh", hash: from[1] };
  },
  decode: (to) => to.type === "wsh" ? [0, to.hash] : void 0
};
var OutWPKH = {
  encode(from) {
    if (from.length !== 2 || from[0] !== 0 || !isBytes2(from[1]))
      return;
    if (from[1].length !== 20)
      return;
    return { type: "wpkh", hash: from[1] };
  },
  decode: (to) => to.type === "wpkh" ? [0, to.hash] : void 0
};
var OutMS = {
  encode(from) {
    const last = from.length - 1;
    if (from[last] !== "CHECKMULTISIG")
      return;
    const m = from[0];
    const n = from[last - 1];
    if (typeof m !== "number" || typeof n !== "number")
      return;
    const pubkeys = from.slice(1, -2);
    if (n !== pubkeys.length)
      return;
    for (const pub of pubkeys)
      if (!isBytes2(pub))
        return;
    return { type: "ms", m, pubkeys };
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (to) => to.type === "ms" ? [to.m, ...to.pubkeys, to.pubkeys.length, "CHECKMULTISIG"] : void 0
};
var OutTR = {
  encode(from) {
    if (from.length !== 2 || from[0] !== 1 || !isBytes2(from[1]))
      return;
    return { type: "tr", pubkey: from[1] };
  },
  decode: (to) => to.type === "tr" ? [1, to.pubkey] : void 0
};
var OutTRNS = {
  encode(from) {
    const last = from.length - 1;
    if (from[last] !== "CHECKSIG")
      return;
    const pubkeys = [];
    for (let i = 0; i < last; i++) {
      const elm = from[i];
      if (i & 1) {
        if (elm !== "CHECKSIGVERIFY" || i === last - 1)
          return;
        continue;
      }
      if (!isBytes2(elm))
        return;
      pubkeys.push(elm);
    }
    return { type: "tr_ns", pubkeys };
  },
  decode: (to) => {
    if (to.type !== "tr_ns")
      return;
    const out = [];
    for (let i = 0; i < to.pubkeys.length - 1; i++)
      out.push(to.pubkeys[i], "CHECKSIGVERIFY");
    out.push(to.pubkeys[to.pubkeys.length - 1], "CHECKSIG");
    return out;
  }
};
var OutTRMS = {
  encode(from) {
    const last = from.length - 1;
    if (from[last] !== "NUMEQUAL" || from[1] !== "CHECKSIG")
      return;
    const pubkeys = [];
    const m = OpToNum(from[last - 1]);
    if (typeof m !== "number")
      return;
    for (let i = 0; i < last - 1; i++) {
      const elm = from[i];
      if (i & 1) {
        if (elm !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
          throw new Error("OutScript.encode/tr_ms: wrong element");
        continue;
      }
      if (!isBytes2(elm))
        throw new Error("OutScript.encode/tr_ms: wrong key element");
      pubkeys.push(elm);
    }
    return { type: "tr_ms", pubkeys, m };
  },
  decode: (to) => {
    if (to.type !== "tr_ms")
      return;
    const out = [to.pubkeys[0], "CHECKSIG"];
    for (let i = 1; i < to.pubkeys.length; i++)
      out.push(to.pubkeys[i], "CHECKSIGADD");
    out.push(to.m, "NUMEQUAL");
    return out;
  }
};
var OutUnknown = {
  encode(from) {
    return { type: "unknown", script: Script.encode(from) };
  },
  decode: (to) => to.type === "unknown" ? Script.decode(to.script) : void 0
};
var OutScripts = [
  OutP2A,
  OutPK,
  OutPKH,
  OutSH,
  OutWSH,
  OutWPKH,
  OutMS,
  OutTR,
  OutTRNS,
  OutTRMS,
  OutUnknown
];
var _OutScript = apply(Script, coders.match(OutScripts));
var OutScript = validate(_OutScript, (i) => {
  if (i.type === "pk" && !isValidPubkey(i.pubkey, PubT.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((i.type === "pkh" || i.type === "sh" || i.type === "wpkh") && (!isBytes2(i.hash) || i.hash.length !== 20))
    throw new Error(`OutScript/${i.type}: wrong hash`);
  if (i.type === "wsh" && (!isBytes2(i.hash) || i.hash.length !== 32))
    throw new Error(`OutScript/wsh: wrong hash`);
  if (i.type === "tr" && (!isBytes2(i.pubkey) || !isValidPubkey(i.pubkey, PubT.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if (i.type === "ms" || i.type === "tr_ns" || i.type === "tr_ms") {
    if (!Array.isArray(i.pubkeys))
      throw new Error("OutScript/multisig: wrong pubkeys array");
  }
  if (i.type === "ms") {
    const n = i.pubkeys.length;
    for (const p of i.pubkeys)
      if (!isValidPubkey(p, PubT.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (i.m <= 0 || n > 16 || i.m > n)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (i.type === "tr_ns" || i.type === "tr_ms") {
    for (const p of i.pubkeys)
      if (!isValidPubkey(p, PubT.schnorr))
        throw new Error(`OutScript/${i.type}: wrong pubkey`);
  }
  if (i.type === "tr_ms") {
    const n = i.pubkeys.length;
    if (i.m <= 0 || n > 999 || i.m > n)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return i;
});
function checkWSH(s, witnessScript) {
  if (!equalBytes2(s.hash, sha256(witnessScript)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const w = OutScript.decode(witnessScript);
  if (w.type === "tr" || w.type === "tr_ns" || w.type === "tr_ms")
    throw new Error(`checkScript: P2${w.type} cannot be wrapped in P2SH`);
  if (w.type === "wpkh" || w.type === "sh")
    throw new Error(`checkScript: P2${w.type} cannot be wrapped in P2WSH`);
}
function checkScript(script, redeemScript, witnessScript) {
  if (script) {
    const s = OutScript.decode(script);
    if (s.type === "tr_ns" || s.type === "tr_ms" || s.type === "ms" || s.type == "pk")
      throw new Error(`checkScript: non-wrapped ${s.type}`);
    if (s.type === "sh" && redeemScript) {
      if (!equalBytes2(s.hash, hash160(redeemScript)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const r = OutScript.decode(redeemScript);
      if (r.type === "tr" || r.type === "tr_ns" || r.type === "tr_ms")
        throw new Error(`checkScript: P2${r.type} cannot be wrapped in P2SH`);
      if (r.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    if (s.type === "wsh" && witnessScript)
      checkWSH(s, witnessScript);
  }
  if (redeemScript) {
    const r = OutScript.decode(redeemScript);
    if (r.type === "wsh" && witnessScript)
      checkWSH(r, witnessScript);
  }
}
function uniqPubkey(pubkeys) {
  const map = {};
  for (const pub of pubkeys) {
    const key = hex.encode(pub);
    if (map[key])
      throw new Error(`Multisig: non-uniq pubkey: ${pubkeys.map(hex.encode)}`);
    map[key] = true;
  }
}
var p2pk = (pubkey, _network = NETWORK) => {
  if (!isValidPubkey(pubkey, PubT.ecdsa))
    throw new Error("P2PK: invalid publicKey");
  return { type: "pk", script: OutScript.encode({ type: "pk", pubkey }) };
};
var p2pkh = (publicKey, network = NETWORK) => {
  if (!isValidPubkey(publicKey, PubT.ecdsa))
    throw new Error("P2PKH: invalid publicKey");
  const hash = hash160(publicKey);
  return {
    type: "pkh",
    script: OutScript.encode({ type: "pkh", hash }),
    address: Address(network).encode({ type: "pkh", hash }),
    hash
  };
};
var p2sh = (child, network = NETWORK) => {
  const cs = child.script;
  if (!isBytes2(cs))
    throw new Error(`Wrong script: ${typeof child.script}, expected Uint8Array`);
  const hash = hash160(cs);
  const script = OutScript.encode({ type: "sh", hash });
  checkScript(script, cs, child.witnessScript);
  if (child.witnessScript) {
    return {
      type: "sh",
      redeemScript: cs,
      script: OutScript.encode({ type: "sh", hash }),
      address: Address(network).encode({ type: "sh", hash }),
      hash,
      witnessScript: child.witnessScript
    };
  } else {
    return {
      type: "sh",
      redeemScript: cs,
      script: OutScript.encode({ type: "sh", hash }),
      address: Address(network).encode({ type: "sh", hash }),
      hash
    };
  }
};
var p2wsh = (child, network = NETWORK) => {
  const cs = child.script;
  if (!isBytes2(cs))
    throw new Error(`Wrong script: ${typeof cs}, expected Uint8Array`);
  const hash = sha256(cs);
  const script = OutScript.encode({ type: "wsh", hash });
  checkScript(script, void 0, cs);
  return {
    type: "wsh",
    witnessScript: cs,
    script: OutScript.encode({ type: "wsh", hash }),
    address: Address(network).encode({ type: "wsh", hash }),
    hash
  };
};
var p2wpkh = (publicKey, network = NETWORK) => {
  if (!isValidPubkey(publicKey, PubT.ecdsa))
    throw new Error("P2WPKH: invalid publicKey");
  if (publicKey.length === 65)
    throw new Error("P2WPKH: uncompressed public key");
  const hash = hash160(publicKey);
  return {
    type: "wpkh",
    script: OutScript.encode({ type: "wpkh", hash }),
    address: Address(network).encode({ type: "wpkh", hash }),
    hash
  };
};
var p2ms = (m, pubkeys, allowSamePubkeys = false) => {
  if (!allowSamePubkeys)
    uniqPubkey(pubkeys);
  return {
    type: "ms",
    script: OutScript.encode({ type: "ms", pubkeys, m })
  };
};
function checkTaprootScript(script, internalPubKey, allowUnknownOutputs = false, customScripts) {
  const out = OutScript.decode(script);
  if (out.type === "unknown") {
    if (customScripts) {
      const cs = apply(Script, coders.match(customScripts));
      const c = cs.decode(script);
      if (c !== void 0) {
        if (typeof c.type !== "string" || !c.type.startsWith("tr_"))
          throw new Error(`P2TR: invalid custom type=${c.type}`);
        return;
      }
    }
    if (allowUnknownOutputs)
      return;
  }
  if (!["tr_ns", "tr_ms"].includes(out.type))
    throw new Error(`P2TR: invalid leaf script=${out.type}`);
  const outms = out;
  if (!allowUnknownOutputs && outms.pubkeys) {
    for (const p of outms.pubkeys) {
      if (equalBytes2(p, TAPROOT_UNSPENDABLE_KEY))
        throw new Error("Unspendable taproot key in leaf script");
      if (equalBytes2(p, internalPubKey)) {
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
      }
    }
  }
}
function taprootListToTree(taprootList) {
  const lst = Array.from(taprootList);
  while (lst.length >= 2) {
    lst.sort((a2, b2) => (b2.weight || 1) - (a2.weight || 1));
    const b = lst.pop();
    const a = lst.pop();
    const weight = ((a == null ? void 0 : a.weight) || 1) + ((b == null ? void 0 : b.weight) || 1);
    lst.push({
      weight,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [(a == null ? void 0 : a.childs) || a, (b == null ? void 0 : b.childs) || b]
    });
  }
  const last = lst[0];
  return (last == null ? void 0 : last.childs) || last;
}
function taprootAddPath(tree, path = []) {
  if (!tree)
    throw new Error(`taprootAddPath: empty tree`);
  if (tree.type === "leaf")
    return { ...tree, path };
  if (tree.type !== "branch")
    throw new Error(`taprootAddPath: wrong type=${tree}`);
  return {
    ...tree,
    path,
    // Left element has right hash in path and otherwise
    left: taprootAddPath(tree.left, [tree.right.hash, ...path]),
    right: taprootAddPath(tree.right, [tree.left.hash, ...path])
  };
}
function taprootWalkTree(tree) {
  if (!tree)
    throw new Error(`taprootAddPath: empty tree`);
  if (tree.type === "leaf")
    return [tree];
  if (tree.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${tree}`);
  return [...taprootWalkTree(tree.left), ...taprootWalkTree(tree.right)];
}
function taprootHashTree(tree, internalPubKey, allowUnknownOutputs = false, customScripts) {
  if (!tree)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(tree) && tree.length === 1)
    tree = tree[0];
  if (!Array.isArray(tree)) {
    const { leafVersion: version, script: leafScript } = tree;
    if (tree.tapLeafScript || tree.tapMerkleRoot && !equalBytes2(tree.tapMerkleRoot, EMPTY))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const script = typeof leafScript === "string" ? hex.decode(leafScript) : leafScript;
    if (!isBytes2(script))
      throw new Error(`checkScript: wrong script type=${script}`);
    checkTaprootScript(script, internalPubKey, allowUnknownOutputs, customScripts);
    return {
      type: "leaf",
      version,
      script,
      hash: tapLeafHash(script, version)
    };
  }
  if (tree.length !== 2)
    tree = taprootListToTree(tree);
  if (tree.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const left = taprootHashTree(tree[0], internalPubKey, allowUnknownOutputs, customScripts);
  const right = taprootHashTree(tree[1], internalPubKey, allowUnknownOutputs, customScripts);
  let [lH, rH] = [left.hash, right.hash];
  if (compareBytes(rH, lH) === -1)
    [lH, rH] = [rH, lH];
  return { type: "branch", left, right, hash: tagSchnorr("TapBranch", lH, rH) };
}
var TAP_LEAF_VERSION = 192;
var tapLeafHash = (script, version = TAP_LEAF_VERSION) => tagSchnorr("TapLeaf", new Uint8Array([version]), VarBytes.encode(script));
function p2tr(internalPubKey, tree, network = NETWORK, allowUnknownOutputs = false, customScripts) {
  if (!internalPubKey && !tree)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const pubKey = typeof internalPubKey === "string" ? hex.decode(internalPubKey) : internalPubKey || TAPROOT_UNSPENDABLE_KEY;
  if (!isValidPubkey(pubKey, PubT.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (tree) {
    let hashedTree = taprootAddPath(taprootHashTree(tree, pubKey, allowUnknownOutputs, customScripts));
    const tapMerkleRoot = hashedTree.hash;
    const [tweakedPubkey, parity] = taprootTweakPubkey(pubKey, tapMerkleRoot);
    const leaves = taprootWalkTree(hashedTree).map((l) => ({
      ...l,
      controlBlock: TaprootControlBlock.encode({
        version: (l.version || TAP_LEAF_VERSION) + parity,
        internalKey: pubKey,
        merklePath: l.path
      })
    }));
    return {
      type: "tr",
      script: OutScript.encode({ type: "tr", pubkey: tweakedPubkey }),
      address: Address(network).encode({ type: "tr", pubkey: tweakedPubkey }),
      // For tests
      tweakedPubkey,
      // PSBT stuff
      tapInternalKey: pubKey,
      leaves,
      tapLeafScript: leaves.map((l) => [
        TaprootControlBlock.decode(l.controlBlock),
        concatBytes2(l.script, new Uint8Array([l.version || TAP_LEAF_VERSION]))
      ]),
      tapMerkleRoot
    };
  } else {
    const tweakedPubkey = taprootTweakPubkey(pubKey, EMPTY)[0];
    return {
      type: "tr",
      script: OutScript.encode({ type: "tr", pubkey: tweakedPubkey }),
      address: Address(network).encode({ type: "tr", pubkey: tweakedPubkey }),
      // For tests
      tweakedPubkey,
      // PSBT stuff
      tapInternalKey: pubKey
    };
  }
}
function combinations(m, list) {
  const res = [];
  if (!Array.isArray(list))
    throw new Error("combinations: lst arg should be array");
  const n = list.length;
  if (m > n)
    throw new Error("combinations: m > lst.length, no combinations possible");
  const idx = Array.from({ length: m }, (_, i) => i);
  const last = idx.length - 1;
  main: for (; ; ) {
    res.push(idx.map((i2) => list[i2]));
    idx[last] += 1;
    let i = last;
    for (; i >= 0 && idx[i] > n - m + i; i--) {
      idx[i] = 0;
      if (i === 0)
        break main;
      idx[i - 1] += 1;
    }
    for (i += 1; i < idx.length; i++)
      idx[i] = idx[i - 1] + 1;
  }
  return res;
}
var p2tr_ns = (m, pubkeys, allowSamePubkeys = false) => {
  if (!allowSamePubkeys)
    uniqPubkey(pubkeys);
  return combinations(m, pubkeys).map((i) => ({
    type: "tr_ns",
    script: OutScript.encode({ type: "tr_ns", pubkeys: i })
  }));
};
var p2tr_pk = (pubkey) => p2tr_ns(1, [pubkey], void 0)[0];
function p2tr_ms(m, pubkeys, allowSamePubkeys = false) {
  if (!allowSamePubkeys)
    uniqPubkey(pubkeys);
  return {
    type: "tr_ms",
    script: OutScript.encode({ type: "tr_ms", pubkeys, m })
  };
}
function getAddress(type, privKey, network = NETWORK) {
  if (type === "tr") {
    return p2tr(pubSchnorr(privKey), void 0, network).address;
  }
  const pubKey = pubECDSA(privKey);
  if (type === "pkh")
    return p2pkh(pubKey, network).address;
  if (type === "wpkh")
    return p2wpkh(pubKey, network).address;
  throw new Error(`getAddress: unknown type=${type}`);
}
var _sortPubkeys = (pubkeys) => Array.from(pubkeys).sort(compareBytes);
function multisig(m, pubkeys, sorted = false, witness = false, network = NETWORK) {
  const ms = p2ms(m, sorted ? _sortPubkeys(pubkeys) : pubkeys);
  return witness ? p2wsh(ms, network) : p2sh(ms, network);
}
function sortedMultisig(m, pubkeys, witness = false, network = NETWORK) {
  return multisig(m, pubkeys, true, witness, network);
}
var base58check = createBase58check(sha256);
function validateWitness(version, data) {
  if (data.length < 2 || data.length > 40)
    throw new Error("Witness: invalid length");
  if (version > 16)
    throw new Error("Witness: invalid version");
  if (version === 0 && !(data.length === 20 || data.length === 32))
    throw new Error("Witness: invalid length for version");
}
function programToWitness(version, data, network = NETWORK) {
  validateWitness(version, data);
  const coder = version === 0 ? bech32 : bech32m;
  return coder.encode(network.bech32, [version].concat(coder.toWords(data)));
}
function formatKey(hashed, prefix2) {
  return base58check.encode(concatBytes2(Uint8Array.from(prefix2), hashed));
}
function WIF(network = NETWORK) {
  return {
    encode(privKey) {
      const compressed = concatBytes2(privKey, new Uint8Array([1]));
      return formatKey(compressed.subarray(0, 33), [network.wif]);
    },
    decode(wif) {
      let parsed = base58check.decode(wif);
      if (parsed[0] !== network.wif)
        throw new Error("Wrong WIF prefix");
      parsed = parsed.subarray(1);
      if (parsed.length !== 33)
        throw new Error("Wrong WIF length");
      if (parsed[32] !== 1)
        throw new Error("Wrong WIF postfix");
      return parsed.subarray(0, -1);
    }
  };
}
function Address(network = NETWORK) {
  return {
    encode(from) {
      const { type } = from;
      if (type === "wpkh")
        return programToWitness(0, from.hash, network);
      else if (type === "wsh")
        return programToWitness(0, from.hash, network);
      else if (type === "tr")
        return programToWitness(1, from.pubkey, network);
      else if (type === "pkh")
        return formatKey(from.hash, [network.pubKeyHash]);
      else if (type === "sh")
        return formatKey(from.hash, [network.scriptHash]);
      throw new Error(`Unknown address type=${type}`);
    },
    decode(address) {
      if (address.length < 14 || address.length > 74)
        throw new Error("Invalid address length");
      if (network.bech32 && address.toLowerCase().startsWith(`${network.bech32}1`)) {
        let res;
        try {
          res = bech32.decode(address);
          if (res.words[0] !== 0)
            throw new Error(`bech32: wrong version=${res.words[0]}`);
        } catch (_) {
          res = bech32m.decode(address);
          if (res.words[0] === 0)
            throw new Error(`bech32m: wrong version=${res.words[0]}`);
        }
        if (res.prefix !== network.bech32)
          throw new Error(`wrong bech32 prefix=${res.prefix}`);
        const [version, ...program] = res.words;
        const data2 = bech32.fromWords(program);
        validateWitness(version, data2);
        if (version === 0 && data2.length === 32)
          return { type: "wsh", hash: data2 };
        else if (version === 0 && data2.length === 20)
          return { type: "wpkh", hash: data2 };
        else if (version === 1 && data2.length === 32)
          return { type: "tr", pubkey: data2 };
        else
          throw new Error("Unknown witness program");
      }
      const data = base58check.decode(address);
      if (data.length !== 21)
        throw new Error("Invalid base58 address");
      if (data[0] === network.pubKeyHash) {
        return { type: "pkh", hash: data.slice(1) };
      } else if (data[0] === network.scriptHash) {
        return {
          type: "sh",
          hash: data.slice(1)
        };
      }
      throw new Error(`Invalid address prefix=${data[0]}`);
    }
  };
}

// node_modules/@scure/btc-signer/esm/transaction.js
var EMPTY32 = new Uint8Array(32);
var EMPTY_OUTPUT = {
  amount: 0xffffffffffffffffn,
  script: EMPTY
};
var toVsize = (weight) => Math.ceil(weight / 4);
var PRECISION = 8;
var DEFAULT_VERSION = 2;
var DEFAULT_LOCKTIME = 0;
var DEFAULT_SEQUENCE = 4294967295;
var Decimal = coders.decimal(PRECISION);
var def = (value, def2) => value === void 0 ? def2 : value;
function cloneDeep(obj) {
  if (Array.isArray(obj))
    return obj.map((i) => cloneDeep(i));
  else if (isBytes2(obj))
    return Uint8Array.from(obj);
  else if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof obj))
    return obj;
  else if (obj === null)
    return obj;
  else if (typeof obj === "object") {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, cloneDeep(v)]));
  }
  throw new Error(`cloneDeep: unknown type=${obj} (${typeof obj})`);
}
var SignatureHash;
(function(SignatureHash2) {
  SignatureHash2[SignatureHash2["DEFAULT"] = 0] = "DEFAULT";
  SignatureHash2[SignatureHash2["ALL"] = 1] = "ALL";
  SignatureHash2[SignatureHash2["NONE"] = 2] = "NONE";
  SignatureHash2[SignatureHash2["SINGLE"] = 3] = "SINGLE";
  SignatureHash2[SignatureHash2["ANYONECANPAY"] = 128] = "ANYONECANPAY";
})(SignatureHash || (SignatureHash = {}));
var SigHash;
(function(SigHash2) {
  SigHash2[SigHash2["DEFAULT"] = 0] = "DEFAULT";
  SigHash2[SigHash2["ALL"] = 1] = "ALL";
  SigHash2[SigHash2["NONE"] = 2] = "NONE";
  SigHash2[SigHash2["SINGLE"] = 3] = "SINGLE";
  SigHash2[SigHash2["DEFAULT_ANYONECANPAY"] = 128] = "DEFAULT_ANYONECANPAY";
  SigHash2[SigHash2["ALL_ANYONECANPAY"] = 129] = "ALL_ANYONECANPAY";
  SigHash2[SigHash2["NONE_ANYONECANPAY"] = 130] = "NONE_ANYONECANPAY";
  SigHash2[SigHash2["SINGLE_ANYONECANPAY"] = 131] = "SINGLE_ANYONECANPAY";
})(SigHash || (SigHash = {}));
function getTaprootKeys(privKey, pubKey, internalKey, merkleRoot = EMPTY) {
  if (equalBytes2(internalKey, pubKey)) {
    privKey = taprootTweakPrivKey(privKey, merkleRoot);
    pubKey = pubSchnorr(privKey);
  }
  return { privKey, pubKey };
}
function outputBeforeSign(i) {
  if (i.script === void 0 || i.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: i.script, amount: i.amount };
}
function inputBeforeSign(i) {
  if (i.txid === void 0 || i.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: i.txid,
    index: i.index,
    sequence: def(i.sequence, DEFAULT_SEQUENCE),
    finalScriptSig: def(i.finalScriptSig, EMPTY)
  };
}
function cleanFinalInput(i) {
  for (const _k in i) {
    const k = _k;
    if (!PSBTInputFinalKeys.includes(k))
      delete i[k];
  }
}
var TxHashIdx = struct({ txid: createBytes(32, true), index: U32LE });
function validateSigHash(s) {
  if (typeof s !== "number" || typeof SigHash[s] !== "string")
    throw new Error(`Invalid SigHash=${s}`);
  return s;
}
function unpackSighash(hashType) {
  const masked = hashType & 31;
  return {
    isAny: !!(hashType & SignatureHash.ANYONECANPAY),
    isNone: masked === SignatureHash.NONE,
    isSingle: masked === SignatureHash.SINGLE
  };
}
function validateOpts(opts) {
  if (opts !== void 0 && {}.toString.call(opts) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${opts}`);
  const _opts = {
    ...opts,
    // Defaults
    version: def(opts.version, DEFAULT_VERSION),
    lockTime: def(opts.lockTime, 0),
    PSBTVersion: def(opts.PSBTVersion, 0)
  };
  if (typeof _opts.allowUnknowInput !== "undefined")
    opts.allowUnknownInputs = _opts.allowUnknowInput;
  if (typeof _opts.allowUnknowOutput !== "undefined")
    opts.allowUnknownOutputs = _opts.allowUnknowOutput;
  if (typeof _opts.lockTime !== "number")
    throw new Error("Transaction lock time should be number");
  U32LE.encode(_opts.lockTime);
  if (_opts.PSBTVersion !== 0 && _opts.PSBTVersion !== 2)
    throw new Error(`Unknown PSBT version ${_opts.PSBTVersion}`);
  for (const k of [
    "allowUnknownVersion",
    "allowUnknownOutputs",
    "allowUnknownInputs",
    "disableScriptCheck",
    "bip174jsCompat",
    "allowLegacyWitnessUtxo",
    "lowR"
  ]) {
    const v = _opts[k];
    if (v === void 0)
      continue;
    if (typeof v !== "boolean")
      throw new Error(`Transation options wrong type: ${k}=${v} (${typeof v})`);
  }
  if (_opts.allowUnknownVersion ? typeof _opts.version === "number" : ![-1, 0, 1, 2, 3].includes(_opts.version))
    throw new Error(`Unknown version: ${_opts.version}`);
  if (_opts.customScripts !== void 0) {
    const cs = _opts.customScripts;
    if (!Array.isArray(cs)) {
      throw new Error(`wrong custom scripts type (expected array): customScripts=${cs} (${typeof cs})`);
    }
    for (const s of cs) {
      if (typeof s.encode !== "function" || typeof s.decode !== "function")
        throw new Error(`wrong script=${s} (${typeof s})`);
      if (s.finalizeTaproot !== void 0 && typeof s.finalizeTaproot !== "function")
        throw new Error(`wrong script=${s} (${typeof s})`);
    }
  }
  return Object.freeze(_opts);
}
function validateInput(i) {
  if (i.nonWitnessUtxo && i.index !== void 0) {
    const last = i.nonWitnessUtxo.outputs.length - 1;
    if (i.index > last)
      throw new Error(`validateInput: index(${i.index}) not in nonWitnessUtxo`);
    const prevOut = i.nonWitnessUtxo.outputs[i.index];
    if (i.witnessUtxo && (!equalBytes2(i.witnessUtxo.script, prevOut.script) || i.witnessUtxo.amount !== prevOut.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (i.txid) {
      const outputs = i.nonWitnessUtxo.outputs;
      if (outputs.length - 1 < i.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const tx = Transaction.fromRaw(RawTx.encode(i.nonWitnessUtxo), {
        allowUnknownOutputs: true,
        disableScriptCheck: true,
        allowUnknownInputs: true
      });
      const txid = hex.encode(i.txid);
      if (tx.isFinal && tx.id !== txid)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${txid} got=${tx.id}`);
    }
  }
  return i;
}
function getPrevOut(input) {
  if (input.nonWitnessUtxo) {
    if (input.index === void 0)
      throw new Error("Unknown input index");
    return input.nonWitnessUtxo.outputs[input.index];
  } else if (input.witnessUtxo)
    return input.witnessUtxo;
  else
    throw new Error("Cannot find previous output info");
}
function normalizeInput(i, cur, allowedFields, disableScriptCheck = false, allowUnknown = false) {
  let { nonWitnessUtxo, txid } = i;
  if (typeof nonWitnessUtxo === "string")
    nonWitnessUtxo = hex.decode(nonWitnessUtxo);
  if (isBytes2(nonWitnessUtxo))
    nonWitnessUtxo = RawTx.decode(nonWitnessUtxo);
  if (!("nonWitnessUtxo" in i) && nonWitnessUtxo === void 0)
    nonWitnessUtxo = cur == null ? void 0 : cur.nonWitnessUtxo;
  if (typeof txid === "string")
    txid = hex.decode(txid);
  if (txid === void 0)
    txid = cur == null ? void 0 : cur.txid;
  let res = { ...cur, ...i, nonWitnessUtxo, txid };
  if (!("nonWitnessUtxo" in i) && res.nonWitnessUtxo === void 0)
    delete res.nonWitnessUtxo;
  if (res.sequence === void 0)
    res.sequence = DEFAULT_SEQUENCE;
  if (res.tapMerkleRoot === null)
    delete res.tapMerkleRoot;
  res = mergeKeyMap(PSBTInput, res, cur, allowedFields, allowUnknown);
  PSBTInputCoder.encode(res);
  let prevOut;
  if (res.nonWitnessUtxo && res.index !== void 0)
    prevOut = res.nonWitnessUtxo.outputs[res.index];
  else if (res.witnessUtxo)
    prevOut = res.witnessUtxo;
  if (prevOut && !disableScriptCheck)
    checkScript(prevOut && prevOut.script, res.redeemScript, res.witnessScript);
  return res;
}
function getInputType(input, allowLegacyWitnessUtxo = false) {
  let txType = "legacy";
  let defaultSighash = SignatureHash.ALL;
  const prevOut = getPrevOut(input);
  const first = OutScript.decode(prevOut.script);
  let type = first.type;
  let cur = first;
  const stack = [first];
  if (first.type === "tr") {
    defaultSighash = SignatureHash.DEFAULT;
    return {
      txType: "taproot",
      type: "tr",
      last: first,
      lastScript: prevOut.script,
      defaultSighash,
      sighash: input.sighashType || defaultSighash
    };
  } else {
    if (first.type === "wpkh" || first.type === "wsh")
      txType = "segwit";
    if (first.type === "sh") {
      if (!input.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let child = OutScript.decode(input.redeemScript);
      if (child.type === "wpkh" || child.type === "wsh")
        txType = "segwit";
      stack.push(child);
      cur = child;
      type += `-${child.type}`;
    }
    if (cur.type === "wsh") {
      if (!input.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let child = OutScript.decode(input.witnessScript);
      if (child.type === "wsh")
        txType = "segwit";
      stack.push(child);
      cur = child;
      type += `-${child.type}`;
    }
    const last = stack[stack.length - 1];
    if (last.type === "sh" || last.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const lastScript = OutScript.encode(last);
    const res = {
      type,
      txType,
      last,
      lastScript,
      defaultSighash,
      sighash: input.sighashType || defaultSighash
    };
    if (txType === "legacy" && !allowLegacyWitnessUtxo && !input.nonWitnessUtxo) {
      throw new Error(`Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure`);
    }
    return res;
  }
}
var Transaction = class _Transaction {
  constructor(opts = {}) {
    this.global = {};
    this.inputs = [];
    this.outputs = [];
    const _opts = this.opts = validateOpts(opts);
    if (_opts.lockTime !== DEFAULT_LOCKTIME)
      this.global.fallbackLocktime = _opts.lockTime;
    this.global.txVersion = _opts.version;
  }
  // Import
  static fromRaw(raw, opts = {}) {
    const parsed = RawTx.decode(raw);
    const tx = new _Transaction({ ...opts, version: parsed.version, lockTime: parsed.lockTime });
    for (const o of parsed.outputs)
      tx.addOutput(o);
    tx.outputs = parsed.outputs;
    tx.inputs = parsed.inputs;
    if (parsed.witnesses) {
      for (let i = 0; i < parsed.witnesses.length; i++)
        tx.inputs[i].finalScriptWitness = parsed.witnesses[i];
    }
    return tx;
  }
  // PSBT
  static fromPSBT(psbt_, opts = {}) {
    let parsed;
    try {
      parsed = RawPSBTV0.decode(psbt_);
    } catch (e0) {
      try {
        parsed = RawPSBTV2.decode(psbt_);
      } catch (e2) {
        throw e0;
      }
    }
    const PSBTVersion = parsed.global.version || 0;
    if (PSBTVersion !== 0 && PSBTVersion !== 2)
      throw new Error(`Wrong PSBT version=${PSBTVersion}`);
    const unsigned = parsed.global.unsignedTx;
    const version = PSBTVersion === 0 ? unsigned == null ? void 0 : unsigned.version : parsed.global.txVersion;
    const lockTime = PSBTVersion === 0 ? unsigned == null ? void 0 : unsigned.lockTime : parsed.global.fallbackLocktime;
    const tx = new _Transaction({ ...opts, version, lockTime, PSBTVersion });
    const inputCount = PSBTVersion === 0 ? unsigned == null ? void 0 : unsigned.inputs.length : parsed.global.inputCount;
    tx.inputs = parsed.inputs.slice(0, inputCount).map((i, j) => {
      var _a;
      return validateInput({
        finalScriptSig: EMPTY,
        ...(_a = parsed.global.unsignedTx) == null ? void 0 : _a.inputs[j],
        ...i
      });
    });
    const outputCount = PSBTVersion === 0 ? unsigned == null ? void 0 : unsigned.outputs.length : parsed.global.outputCount;
    tx.outputs = parsed.outputs.slice(0, outputCount).map((i, j) => {
      var _a;
      return {
        ...i,
        ...(_a = parsed.global.unsignedTx) == null ? void 0 : _a.outputs[j]
      };
    });
    tx.global = { ...parsed.global, txVersion: version };
    if (lockTime !== DEFAULT_LOCKTIME)
      tx.global.fallbackLocktime = lockTime;
    return tx;
  }
  toPSBT(PSBTVersion = this.opts.PSBTVersion) {
    if (PSBTVersion !== 0 && PSBTVersion !== 2)
      throw new Error(`Wrong PSBT version=${PSBTVersion}`);
    const inputs = this.inputs.map((i) => validateInput(cleanPSBTFields(PSBTVersion, PSBTInput, i)));
    for (const inp of inputs) {
      if (inp.partialSig && !inp.partialSig.length)
        delete inp.partialSig;
      if (inp.finalScriptSig && !inp.finalScriptSig.length)
        delete inp.finalScriptSig;
      if (inp.finalScriptWitness && !inp.finalScriptWitness.length)
        delete inp.finalScriptWitness;
    }
    const outputs = this.outputs.map((i) => cleanPSBTFields(PSBTVersion, PSBTOutput, i));
    const global = { ...this.global };
    if (PSBTVersion === 0) {
      global.unsignedTx = RawOldTx.decode(RawOldTx.encode({
        version: this.version,
        lockTime: this.lockTime,
        inputs: this.inputs.map(inputBeforeSign).map((i) => ({
          ...i,
          finalScriptSig: EMPTY
        })),
        outputs: this.outputs.map(outputBeforeSign)
      }));
      delete global.fallbackLocktime;
      delete global.txVersion;
    } else {
      global.version = PSBTVersion;
      global.txVersion = this.version;
      global.inputCount = this.inputs.length;
      global.outputCount = this.outputs.length;
      if (global.fallbackLocktime && global.fallbackLocktime === DEFAULT_LOCKTIME)
        delete global.fallbackLocktime;
    }
    if (this.opts.bip174jsCompat) {
      if (!inputs.length)
        inputs.push({});
      if (!outputs.length)
        outputs.push({});
    }
    return (PSBTVersion === 0 ? RawPSBTV0 : RawPSBTV2).encode({
      global,
      inputs,
      outputs
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let height = DEFAULT_LOCKTIME;
    let heightCnt = 0;
    let time = DEFAULT_LOCKTIME;
    let timeCnt = 0;
    for (const i of this.inputs) {
      if (i.requiredHeightLocktime) {
        height = Math.max(height, i.requiredHeightLocktime);
        heightCnt++;
      }
      if (i.requiredTimeLocktime) {
        time = Math.max(time, i.requiredTimeLocktime);
        timeCnt++;
      }
    }
    if (heightCnt && heightCnt >= timeCnt)
      return height;
    if (time !== DEFAULT_LOCKTIME)
      return time;
    return this.global.fallbackLocktime || DEFAULT_LOCKTIME;
  }
  get version() {
    if (this.global.txVersion === void 0)
      throw new Error("No global.txVersion");
    return this.global.txVersion;
  }
  inputStatus(idx) {
    this.checkInputIdx(idx);
    const input = this.inputs[idx];
    if (input.finalScriptSig && input.finalScriptSig.length)
      return "finalized";
    if (input.finalScriptWitness && input.finalScriptWitness.length)
      return "finalized";
    if (input.tapKeySig)
      return "signed";
    if (input.tapScriptSig && input.tapScriptSig.length)
      return "signed";
    if (input.partialSig && input.partialSig.length)
      return "signed";
    return "unsigned";
  }
  // Cannot replace unpackSighash, tests rely on very generic implemenetation with signing inputs outside of range
  // We will lose some vectors -> smaller test coverage of preimages (very important!)
  inputSighash(idx) {
    this.checkInputIdx(idx);
    const inputSighash = this.inputs[idx].sighashType;
    const sighash = inputSighash === void 0 ? SignatureHash.DEFAULT : inputSighash;
    const sigOutputs = sighash === SignatureHash.DEFAULT ? SignatureHash.ALL : sighash & 3;
    const sigInputs = sighash & SignatureHash.ANYONECANPAY;
    return { sigInputs, sigOutputs };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let addInput = true, addOutput = true;
    let inputs = [], outputs = [];
    for (let idx = 0; idx < this.inputs.length; idx++) {
      const status = this.inputStatus(idx);
      if (status === "unsigned")
        continue;
      const { sigInputs, sigOutputs } = this.inputSighash(idx);
      if (sigInputs === SignatureHash.ANYONECANPAY)
        inputs.push(idx);
      else
        addInput = false;
      if (sigOutputs === SignatureHash.ALL)
        addOutput = false;
      else if (sigOutputs === SignatureHash.SINGLE)
        outputs.push(idx);
      else if (sigOutputs === SignatureHash.NONE) {
      } else
        throw new Error(`Wrong signature hash output type: ${sigOutputs}`);
    }
    return { addInput, addOutput, inputs, outputs };
  }
  get isFinal() {
    for (let idx = 0; idx < this.inputs.length; idx++)
      if (this.inputStatus(idx) !== "finalized")
        return false;
    return true;
  }
  // Info utils
  get hasWitnesses() {
    let out = false;
    for (const i of this.inputs)
      if (i.finalScriptWitness && i.finalScriptWitness.length)
        out = true;
    return out;
  }
  // https://en.bitcoin.it/wiki/Weight_units
  get weight() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    let out = 32;
    const outputs = this.outputs.map(outputBeforeSign);
    out += 4 * CompactSizeLen.encode(this.outputs.length).length;
    for (const o of outputs)
      out += 32 + 4 * VarBytes.encode(o.script).length;
    if (this.hasWitnesses)
      out += 2;
    out += 4 * CompactSizeLen.encode(this.inputs.length).length;
    for (const i of this.inputs) {
      out += 160 + 4 * VarBytes.encode(i.finalScriptSig || EMPTY).length;
      if (this.hasWitnesses && i.finalScriptWitness)
        out += RawWitness.encode(i.finalScriptWitness).length;
    }
    return out;
  }
  get vsize() {
    return toVsize(this.weight);
  }
  toBytes(withScriptSig = false, withWitness = false) {
    return RawTx.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(inputBeforeSign).map((i) => ({
        ...i,
        finalScriptSig: withScriptSig && i.finalScriptSig || EMPTY
      })),
      outputs: this.outputs.map(outputBeforeSign),
      witnesses: this.inputs.map((i) => i.finalScriptWitness || []),
      segwitFlag: withWitness && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(false, false);
  }
  get hex() {
    return hex.encode(this.toBytes(true, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return hex.encode(sha256x2(this.toBytes(true)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return hex.encode(sha256x2(this.toBytes(true)).reverse());
  }
  // Input stuff
  checkInputIdx(idx) {
    if (!Number.isSafeInteger(idx) || 0 > idx || idx >= this.inputs.length)
      throw new Error(`Wrong input index=${idx}`);
  }
  getInput(idx) {
    this.checkInputIdx(idx);
    return cloneDeep(this.inputs[idx]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(input, _ignoreSignStatus = false) {
    if (!_ignoreSignStatus && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    this.inputs.push(normalizeInput(input, void 0, void 0, this.opts.disableScriptCheck));
    return this.inputs.length - 1;
  }
  updateInput(idx, input, _ignoreSignStatus = false) {
    this.checkInputIdx(idx);
    let allowedFields = void 0;
    if (!_ignoreSignStatus) {
      const status = this.signStatus();
      if (!status.addInput || status.inputs.includes(idx))
        allowedFields = PSBTInputUnsignedKeys;
    }
    this.inputs[idx] = normalizeInput(input, this.inputs[idx], allowedFields, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(idx) {
    if (!Number.isSafeInteger(idx) || 0 > idx || idx >= this.outputs.length)
      throw new Error(`Wrong output index=${idx}`);
  }
  getOutput(idx) {
    this.checkOutputIdx(idx);
    return cloneDeep(this.outputs[idx]);
  }
  getOutputAddress(idx, network = NETWORK) {
    const out = this.getOutput(idx);
    if (!out.script)
      return;
    return Address(network).encode(OutScript.decode(out.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(o, cur, allowedFields) {
    let { amount, script } = o;
    if (amount === void 0)
      amount = cur == null ? void 0 : cur.amount;
    if (typeof amount !== "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${amount} of type ${typeof amount}`);
    if (typeof script === "string")
      script = hex.decode(script);
    if (script === void 0)
      script = cur == null ? void 0 : cur.script;
    let res = { ...cur, ...o, amount, script };
    if (res.amount === void 0)
      delete res.amount;
    res = mergeKeyMap(PSBTOutput, res, cur, allowedFields, this.opts.allowUnknown);
    PSBTOutputCoder.encode(res);
    if (res.script && !this.opts.allowUnknownOutputs && OutScript.decode(res.script).type === "unknown") {
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    }
    if (!this.opts.disableScriptCheck)
      checkScript(res.script, res.redeemScript, res.witnessScript);
    return res;
  }
  addOutput(o, _ignoreSignStatus = false) {
    if (!_ignoreSignStatus && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    this.outputs.push(this.normalizeOutput(o));
    return this.outputs.length - 1;
  }
  updateOutput(idx, output, _ignoreSignStatus = false) {
    this.checkOutputIdx(idx);
    let allowedFields = void 0;
    if (!_ignoreSignStatus) {
      const status = this.signStatus();
      if (!status.addOutput || status.outputs.includes(idx))
        allowedFields = PSBTOutputUnsignedKeys;
    }
    this.outputs[idx] = this.normalizeOutput(output, this.outputs[idx], allowedFields);
  }
  addOutputAddress(address, amount, network = NETWORK) {
    return this.addOutput({ script: OutScript.encode(Address(network).decode(address)), amount });
  }
  // Utils
  get fee() {
    let res = 0n;
    for (const i of this.inputs) {
      const prevOut = getPrevOut(i);
      if (!prevOut)
        throw new Error("Empty input amount");
      res += prevOut.amount;
    }
    const outputs = this.outputs.map(outputBeforeSign);
    for (const o of outputs)
      res -= o.amount;
    return res;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(idx, prevOutScript, hashType) {
    const { isAny, isNone, isSingle } = unpackSighash(hashType);
    if (idx < 0 || !Number.isSafeInteger(idx))
      throw new Error(`Invalid input idx=${idx}`);
    if (isSingle && idx >= this.outputs.length || idx >= this.inputs.length)
      return U256BE.encode(1n);
    prevOutScript = Script.encode(Script.decode(prevOutScript).filter((i) => i !== "CODESEPARATOR"));
    let inputs = this.inputs.map(inputBeforeSign).map((input, inputIdx) => ({
      ...input,
      finalScriptSig: inputIdx === idx ? prevOutScript : EMPTY
    }));
    if (isAny)
      inputs = [inputs[idx]];
    else if (isNone || isSingle) {
      inputs = inputs.map((input, inputIdx) => ({
        ...input,
        sequence: inputIdx === idx ? input.sequence : 0
      }));
    }
    let outputs = this.outputs.map(outputBeforeSign);
    if (isNone)
      outputs = [];
    else if (isSingle) {
      outputs = outputs.slice(0, idx).fill(EMPTY_OUTPUT).concat([outputs[idx]]);
    }
    const tmpTx = RawTx.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: false,
      inputs,
      outputs
    });
    return sha256x2(tmpTx, I32LE.encode(hashType));
  }
  preimageWitnessV0(idx, prevOutScript, hashType, amount) {
    const { isAny, isNone, isSingle } = unpackSighash(hashType);
    let inputHash = EMPTY32;
    let sequenceHash = EMPTY32;
    let outputHash = EMPTY32;
    const inputs = this.inputs.map(inputBeforeSign);
    const outputs = this.outputs.map(outputBeforeSign);
    if (!isAny)
      inputHash = sha256x2(...inputs.map(TxHashIdx.encode));
    if (!isAny && !isSingle && !isNone)
      sequenceHash = sha256x2(...inputs.map((i) => U32LE.encode(i.sequence)));
    if (!isSingle && !isNone) {
      outputHash = sha256x2(...outputs.map(RawOutput.encode));
    } else if (isSingle && idx < outputs.length)
      outputHash = sha256x2(RawOutput.encode(outputs[idx]));
    const input = inputs[idx];
    return sha256x2(I32LE.encode(this.version), inputHash, sequenceHash, createBytes(32, true).encode(input.txid), U32LE.encode(input.index), VarBytes.encode(prevOutScript), U64LE.encode(amount), U32LE.encode(input.sequence), outputHash, U32LE.encode(this.lockTime), U32LE.encode(hashType));
  }
  preimageWitnessV1(idx, prevOutScript, hashType, amount, codeSeparator = -1, leafScript, leafVer = 192, annex) {
    if (!Array.isArray(amount) || this.inputs.length !== amount.length)
      throw new Error(`Invalid amounts array=${amount}`);
    if (!Array.isArray(prevOutScript) || this.inputs.length !== prevOutScript.length)
      throw new Error(`Invalid prevOutScript array=${prevOutScript}`);
    const out = [
      U8.encode(0),
      U8.encode(hashType),
      // U8 sigHash
      I32LE.encode(this.version),
      U32LE.encode(this.lockTime)
    ];
    const outType = hashType === SignatureHash.DEFAULT ? SignatureHash.ALL : hashType & 3;
    const inType = hashType & SignatureHash.ANYONECANPAY;
    const inputs = this.inputs.map(inputBeforeSign);
    const outputs = this.outputs.map(outputBeforeSign);
    if (inType !== SignatureHash.ANYONECANPAY) {
      out.push(...[
        inputs.map(TxHashIdx.encode),
        amount.map(U64LE.encode),
        prevOutScript.map(VarBytes.encode),
        inputs.map((i) => U32LE.encode(i.sequence))
      ].map((i) => sha256(concatBytes2(...i))));
    }
    if (outType === SignatureHash.ALL) {
      out.push(sha256(concatBytes2(...outputs.map(RawOutput.encode))));
    }
    const spendType = (annex ? 1 : 0) | (leafScript ? 2 : 0);
    out.push(new Uint8Array([spendType]));
    if (inType === SignatureHash.ANYONECANPAY) {
      const inp = inputs[idx];
      out.push(TxHashIdx.encode(inp), U64LE.encode(amount[idx]), VarBytes.encode(prevOutScript[idx]), U32LE.encode(inp.sequence));
    } else
      out.push(U32LE.encode(idx));
    if (spendType & 1)
      out.push(sha256(VarBytes.encode(annex || EMPTY)));
    if (outType === SignatureHash.SINGLE)
      out.push(idx < outputs.length ? sha256(RawOutput.encode(outputs[idx])) : EMPTY32);
    if (leafScript)
      out.push(tapLeafHash(leafScript, leafVer), U8.encode(0), I32LE.encode(codeSeparator));
    return tagSchnorr("TapSighash", ...out);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(privateKey, idx, allowedSighash, _auxRand) {
    this.checkInputIdx(idx);
    const input = this.inputs[idx];
    const inputType = getInputType(input, this.opts.allowLegacyWitnessUtxo);
    if (!isBytes2(privateKey)) {
      if (!input.bip32Derivation || !input.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const signers = input.bip32Derivation.filter((i) => i[1].fingerprint == privateKey.fingerprint).map(([pubKey, { path }]) => {
        let s = privateKey;
        for (const i of path)
          s = s.deriveChild(i);
        if (!equalBytes2(s.publicKey, pubKey))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!s.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return s;
      });
      if (!signers.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${privateKey.fingerprint}`);
      let signed = false;
      for (const s of signers)
        if (this.signIdx(s.privateKey, idx))
          signed = true;
      return signed;
    }
    if (!allowedSighash)
      allowedSighash = [inputType.defaultSighash];
    else
      allowedSighash.forEach(validateSigHash);
    const sighash = inputType.sighash;
    if (!allowedSighash.includes(sighash)) {
      throw new Error(`Input with not allowed sigHash=${sighash}. Allowed: ${allowedSighash.join(", ")}`);
    }
    const { sigOutputs } = this.inputSighash(idx);
    if (sigOutputs === SignatureHash.SINGLE && idx >= this.outputs.length) {
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${idx}`);
    }
    const prevOut = getPrevOut(input);
    if (inputType.txType === "taproot") {
      const prevOuts = this.inputs.map(getPrevOut);
      const prevOutScript = prevOuts.map((i) => i.script);
      const amount = prevOuts.map((i) => i.amount);
      let signed = false;
      let schnorrPub = pubSchnorr(privateKey);
      let merkleRoot = input.tapMerkleRoot || EMPTY;
      if (input.tapInternalKey) {
        const { pubKey, privKey } = getTaprootKeys(privateKey, schnorrPub, input.tapInternalKey, merkleRoot);
        const [taprootPubKey, _] = taprootTweakPubkey(input.tapInternalKey, merkleRoot);
        if (equalBytes2(taprootPubKey, pubKey)) {
          const hash = this.preimageWitnessV1(idx, prevOutScript, sighash, amount);
          const sig = concatBytes2(signSchnorr(hash, privKey, _auxRand), sighash !== SignatureHash.DEFAULT ? new Uint8Array([sighash]) : EMPTY);
          this.updateInput(idx, { tapKeySig: sig }, true);
          signed = true;
        }
      }
      if (input.tapLeafScript) {
        input.tapScriptSig = input.tapScriptSig || [];
        for (const [_, _script] of input.tapLeafScript) {
          const script = _script.subarray(0, -1);
          const scriptDecoded = Script.decode(script);
          const ver = _script[_script.length - 1];
          const hash = tapLeafHash(script, ver);
          const pos = scriptDecoded.findIndex((i) => isBytes2(i) && equalBytes2(i, schnorrPub));
          if (pos === -1)
            continue;
          const msg = this.preimageWitnessV1(idx, prevOutScript, sighash, amount, void 0, script, ver);
          const sig = concatBytes2(signSchnorr(msg, privateKey, _auxRand), sighash !== SignatureHash.DEFAULT ? new Uint8Array([sighash]) : EMPTY);
          this.updateInput(idx, { tapScriptSig: [[{ pubKey: schnorrPub, leafHash: hash }, sig]] }, true);
          signed = true;
        }
      }
      if (!signed)
        throw new Error("No taproot scripts signed");
      return true;
    } else {
      const pubKey = pubECDSA(privateKey);
      let hasPubkey = false;
      const pubKeyHash = hash160(pubKey);
      for (const i of Script.decode(inputType.lastScript)) {
        if (isBytes2(i) && (equalBytes2(i, pubKey) || equalBytes2(i, pubKeyHash)))
          hasPubkey = true;
      }
      if (!hasPubkey)
        throw new Error(`Input script doesn't have pubKey: ${inputType.lastScript}`);
      let hash;
      if (inputType.txType === "legacy") {
        hash = this.preimageLegacy(idx, inputType.lastScript, sighash);
      } else if (inputType.txType === "segwit") {
        let script = inputType.lastScript;
        if (inputType.last.type === "wpkh")
          script = OutScript.encode({ type: "pkh", hash: inputType.last.hash });
        hash = this.preimageWitnessV0(idx, script, sighash, prevOut.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${inputType.txType}`);
      const sig = signECDSA(hash, privateKey, this.opts.lowR);
      this.updateInput(idx, {
        partialSig: [[pubKey, concatBytes2(sig, new Uint8Array([sighash]))]]
      }, true);
    }
    return true;
  }
  // This is bad API. Will work if user creates and signs tx, but if
  // there is some complex workflow with exchanging PSBT and signing them,
  // then it is better to validate which output user signs. How could a better API look like?
  // Example: user adds input, sends to another party, then signs received input (mixer etc),
  // another user can add different input for same key and user will sign it.
  // Even worse: another user can add bip32 derivation, and spend money from different address.
  // Better api: signIdx
  sign(privateKey, allowedSighash, _auxRand) {
    let num = 0;
    for (let i = 0; i < this.inputs.length; i++) {
      try {
        if (this.signIdx(privateKey, i, allowedSighash, _auxRand))
          num++;
      } catch (e) {
      }
    }
    if (!num)
      throw new Error("No inputs signed");
    return num;
  }
  finalizeIdx(idx) {
    this.checkInputIdx(idx);
    if (this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const input = this.inputs[idx];
    const inputType = getInputType(input, this.opts.allowLegacyWitnessUtxo);
    if (inputType.txType === "taproot") {
      if (input.tapKeySig)
        input.finalScriptWitness = [input.tapKeySig];
      else if (input.tapLeafScript && input.tapScriptSig) {
        const leafs = input.tapLeafScript.sort((a, b) => TaprootControlBlock.encode(a[0]).length - TaprootControlBlock.encode(b[0]).length);
        for (const [cb, _script] of leafs) {
          const script = _script.slice(0, -1);
          const ver = _script[_script.length - 1];
          const outScript = OutScript.decode(script);
          const hash = tapLeafHash(script, ver);
          const scriptSig = input.tapScriptSig.filter((i) => equalBytes2(i[0].leafHash, hash));
          let signatures = [];
          if (outScript.type === "tr_ms") {
            const m = outScript.m;
            const pubkeys = outScript.pubkeys;
            let added = 0;
            for (const pub of pubkeys) {
              const sigIdx = scriptSig.findIndex((i) => equalBytes2(i[0].pubKey, pub));
              if (added === m || sigIdx === -1) {
                signatures.push(EMPTY);
                continue;
              }
              signatures.push(scriptSig[sigIdx][1]);
              added++;
            }
            if (added !== m)
              continue;
          } else if (outScript.type === "tr_ns") {
            for (const pub of outScript.pubkeys) {
              const sigIdx = scriptSig.findIndex((i) => equalBytes2(i[0].pubKey, pub));
              if (sigIdx === -1)
                continue;
              signatures.push(scriptSig[sigIdx][1]);
            }
            if (signatures.length !== outScript.pubkeys.length)
              continue;
          } else if (outScript.type === "unknown" && this.opts.allowUnknownInputs) {
            const scriptDecoded = Script.decode(script);
            signatures = scriptSig.map(([{ pubKey }, signature]) => {
              const pos = scriptDecoded.findIndex((i) => isBytes2(i) && equalBytes2(i, pubKey));
              if (pos === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature, pos };
            }).sort((a, b) => a.pos - b.pos).map((i) => i.signature);
            if (!signatures.length)
              continue;
          } else {
            const custom = this.opts.customScripts;
            if (custom) {
              for (const c of custom) {
                if (!c.finalizeTaproot)
                  continue;
                const scriptDecoded = Script.decode(script);
                const csEncoded = c.encode(scriptDecoded);
                if (csEncoded === void 0)
                  continue;
                const finalized = c.finalizeTaproot(script, csEncoded, scriptSig);
                if (!finalized)
                  continue;
                input.finalScriptWitness = finalized.concat(TaprootControlBlock.encode(cb));
                input.finalScriptSig = EMPTY;
                cleanFinalInput(input);
                return;
              }
            }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          input.finalScriptWitness = signatures.reverse().concat([script, TaprootControlBlock.encode(cb)]);
          break;
        }
        if (!input.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      input.finalScriptSig = EMPTY;
      cleanFinalInput(input);
      return;
    }
    if (!input.partialSig || !input.partialSig.length)
      throw new Error("Not enough partial sign");
    let inputScript = EMPTY;
    let witness = [];
    if (inputType.last.type === "ms") {
      const m = inputType.last.m;
      const pubkeys = inputType.last.pubkeys;
      let signatures = [];
      for (const pub of pubkeys) {
        const sign = input.partialSig.find((s) => equalBytes2(pub, s[0]));
        if (!sign)
          continue;
        signatures.push(sign[1]);
      }
      signatures = signatures.slice(0, m);
      if (signatures.length !== m) {
        throw new Error(`Multisig: wrong signatures count, m=${m} n=${pubkeys.length} signatures=${signatures.length}`);
      }
      inputScript = Script.encode([0, ...signatures]);
    } else if (inputType.last.type === "pk") {
      inputScript = Script.encode([input.partialSig[0][1]]);
    } else if (inputType.last.type === "pkh") {
      inputScript = Script.encode([input.partialSig[0][1], input.partialSig[0][0]]);
    } else if (inputType.last.type === "wpkh") {
      inputScript = EMPTY;
      witness = [input.partialSig[0][1], input.partialSig[0][0]];
    } else if (inputType.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let finalScriptSig, finalScriptWitness;
    if (inputType.type.includes("wsh-")) {
      if (inputScript.length && inputType.lastScript.length) {
        witness = Script.decode(inputScript).map((i) => {
          if (i === 0)
            return EMPTY;
          if (isBytes2(i))
            return i;
          throw new Error(`Wrong witness op=${i}`);
        });
      }
      witness = witness.concat(inputType.lastScript);
    }
    if (inputType.txType === "segwit")
      finalScriptWitness = witness;
    if (inputType.type.startsWith("sh-wsh-")) {
      finalScriptSig = Script.encode([Script.encode([0, sha256(inputType.lastScript)])]);
    } else if (inputType.type.startsWith("sh-")) {
      finalScriptSig = Script.encode([...Script.decode(inputScript), inputType.lastScript]);
    } else if (inputType.type.startsWith("wsh-")) {
    } else if (inputType.txType !== "segwit")
      finalScriptSig = inputScript;
    if (!finalScriptSig && !finalScriptWitness)
      throw new Error("Unknown error finalizing input");
    if (finalScriptSig)
      input.finalScriptSig = finalScriptSig;
    if (finalScriptWitness)
      input.finalScriptWitness = finalScriptWitness;
    cleanFinalInput(input);
  }
  finalize() {
    for (let i = 0; i < this.inputs.length; i++)
      this.finalizeIdx(i);
  }
  extract() {
    if (!this.isFinal)
      throw new Error("Transaction has unfinalized inputs");
    if (!this.outputs.length)
      throw new Error("Transaction has no outputs");
    if (this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    return this.toBytes(true, true);
  }
  combine(other) {
    for (const k of ["PSBTVersion", "version", "lockTime"]) {
      if (this.opts[k] !== other.opts[k]) {
        throw new Error(`Transaction/combine: different ${k} this=${this.opts[k]} other=${other.opts[k]}`);
      }
    }
    for (const k of ["inputs", "outputs"]) {
      if (this[k].length !== other[k].length) {
        throw new Error(`Transaction/combine: different ${k} length this=${this[k].length} other=${other[k].length}`);
      }
    }
    const thisUnsigned = this.global.unsignedTx ? RawOldTx.encode(this.global.unsignedTx) : EMPTY;
    const otherUnsigned = other.global.unsignedTx ? RawOldTx.encode(other.global.unsignedTx) : EMPTY;
    if (!equalBytes2(thisUnsigned, otherUnsigned))
      throw new Error(`Transaction/combine: different unsigned tx`);
    this.global = mergeKeyMap(PSBTGlobal, this.global, other.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, other.inputs[i], true);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, other.outputs[i], true);
    return this;
  }
  clone() {
    return _Transaction.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
function PSBTCombine(psbts) {
  if (!psbts || !Array.isArray(psbts) || !psbts.length)
    throw new Error("PSBTCombine: wrong PSBT list");
  const tx = Transaction.fromPSBT(psbts[0]);
  for (let i = 1; i < psbts.length; i++)
    tx.combine(Transaction.fromPSBT(psbts[i]));
  return tx.toPSBT();
}
var HARDENED_OFFSET = 2147483648;
function bip32Path(path) {
  const out = [];
  if (!/^[mM]'?/.test(path))
    throw new Error('Path must start with "m" or "M"');
  if (/^[mM]'?$/.test(path))
    return out;
  const parts = path.replace(/^[mM]'?\//, "").split("/");
  for (const c of parts) {
    const m = /^(\d+)('?)$/.exec(c);
    if (!m || m.length !== 3)
      throw new Error(`Invalid child index: ${c}`);
    let idx = +m[1];
    if (!Number.isSafeInteger(idx) || idx >= HARDENED_OFFSET)
      throw new Error("Invalid index");
    if (m[2] === "'")
      idx += HARDENED_OFFSET;
    out.push(idx);
  }
  return out;
}

// node_modules/@scure/btc-signer/esm/utxo.js
var encodeTapBlock = (item) => TaprootControlBlock.encode(item);
function iterLeafs(tapLeafScript, sigSize, customScripts) {
  if (!tapLeafScript || !tapLeafScript.length)
    throw new Error("no leafs");
  const empty = () => new Uint8Array(sigSize);
  const leafs = tapLeafScript.sort((a, b) => encodeTapBlock(a[0]).length - encodeTapBlock(b[0]).length);
  for (const [cb, _script] of leafs) {
    const script = _script.slice(0, -1);
    const ver = _script[_script.length - 1];
    const outs = OutScript.decode(script);
    let signatures = [];
    if (outs.type === "tr_ms") {
      const m = outs.m;
      const n = outs.pubkeys.length - m;
      for (let i = 0; i < m; i++)
        signatures.push(empty());
      for (let i = 0; i < n; i++)
        signatures.push(EMPTY);
    } else if (outs.type === "tr_ns") {
      for (const _pub of outs.pubkeys)
        signatures.push(empty());
    } else {
      if (!customScripts)
        throw new Error("Finalize: Unknown tapLeafScript");
      const leafHash = tapLeafHash(script, ver);
      for (const c of customScripts) {
        if (!c.finalizeTaproot)
          continue;
        const scriptDecoded = Script.decode(script);
        const csEncoded = c.encode(scriptDecoded);
        if (csEncoded === void 0)
          continue;
        const pubKeys = scriptDecoded.filter((i) => {
          if (!isBytes2(i))
            return false;
          try {
            validatePubkey(i, PubT.schnorr);
            return true;
          } catch (e) {
            return false;
          }
        });
        const finalized = c.finalizeTaproot(script, csEncoded, pubKeys.map((pubKey) => [{ pubKey, leafHash }, empty()]));
        if (!finalized)
          continue;
        return finalized.concat(encodeTapBlock(cb));
      }
    }
    return signatures.reverse().concat([script, encodeTapBlock(cb)]);
  }
  throw new Error("there was no witness");
}
function estimateInput(inputType, input, opts) {
  let script = EMPTY;
  let witness;
  if (inputType.txType === "taproot") {
    const SCHNORR_SIG_SIZE = inputType.sighash !== SignatureHash.DEFAULT ? 65 : 64;
    if (input.tapInternalKey && !equalBytes2(input.tapInternalKey, TAPROOT_UNSPENDABLE_KEY)) {
      witness = [new Uint8Array(SCHNORR_SIG_SIZE)];
    } else if (input.tapLeafScript) {
      witness = iterLeafs(input.tapLeafScript, SCHNORR_SIG_SIZE, opts.customScripts);
    } else
      throw new Error("estimateInput/taproot: unknown input");
  } else {
    const empty = () => new Uint8Array(72);
    const emptyPub = () => new Uint8Array(33);
    let inputScript = EMPTY;
    let inputWitness = [];
    const ltype = inputType.last.type;
    if (ltype === "ms") {
      const m = inputType.last.m;
      const sig = [0];
      for (let i = 0; i < m; i++)
        sig.push(empty());
      inputScript = Script.encode(sig);
    } else if (ltype === "pk") {
      inputScript = Script.encode([empty()]);
    } else if (ltype === "pkh") {
      inputScript = Script.encode([empty(), emptyPub()]);
    } else if (ltype === "wpkh") {
      inputScript = EMPTY;
      inputWitness = [empty(), emptyPub()];
    } else if (ltype === "unknown" && !opts.allowUnknownInputs)
      throw new Error("Unknown inputs are not allowed");
    if (inputType.type.includes("wsh-")) {
      if (inputScript.length && inputType.lastScript.length) {
        inputWitness = Script.decode(inputScript).map((i) => {
          if (i === 0)
            return EMPTY;
          if (isBytes2(i))
            return i;
          throw new Error(`Wrong witness op=${i}`);
        });
      }
      inputWitness = inputWitness.concat(inputType.lastScript);
    }
    if (inputType.txType === "segwit")
      witness = inputWitness;
    if (inputType.type.startsWith("sh-wsh-")) {
      script = Script.encode([Script.encode([0, new Uint8Array(sha256.outputLen)])]);
    } else if (inputType.type.startsWith("sh-")) {
      script = Script.encode([...Script.decode(inputScript), inputType.lastScript]);
    } else if (inputType.type.startsWith("wsh-")) {
    } else if (inputType.txType !== "segwit")
      script = inputScript;
  }
  let weight = 160 + 4 * VarBytes.encode(script).length;
  let hasWitnesses = false;
  if (witness) {
    weight += RawWitness.encode(witness).length;
    hasWitnesses = true;
  }
  return { weight, hasWitnesses };
}
var _cmpBig = (a, b) => {
  const n = a - b;
  if (n < 0n)
    return -1;
  else if (n > 0n)
    return 1;
  return 0;
};
function getScript(o, opts = {}, network = NETWORK) {
  let script;
  if ("script" in o && isBytes2(o.script)) {
    script = o.script;
  }
  if ("address" in o) {
    if (typeof o.address !== "string")
      throw new Error(`Estimator: wrong output address=${o.address}`);
    script = OutScript.encode(Address(network).decode(o.address));
  }
  if (!script)
    throw new Error("Estimator: wrong output script");
  if (typeof o.amount !== "bigint")
    throw new Error(`Estimator: wrong output amount=${o.amount}, should be of type bigint but got ${typeof o.amount}.`);
  if (script && !opts.allowUnknownOutputs && OutScript.decode(script).type === "unknown") {
    throw new Error("Estimator: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
  }
  if (!opts.disableScriptCheck)
    checkScript(script);
  return script;
}
var _Estimator = class {
  constructor(inputs, outputs, opts) {
    this.requiredIndices = [];
    this.outputs = outputs;
    this.opts = opts;
    if (typeof opts.feePerByte !== "bigint")
      throw new Error(`Estimator: wrong feePerByte=${opts.feePerByte}, should be of type bigint but got ${typeof opts.feePerByte}.`);
    const inputsDust = 32 + 4 + 1 + 107 + 4;
    const outputDust = 34;
    const dustBytes = opts.dust === void 0 ? BigInt(inputsDust + outputDust) : opts.dust;
    if (typeof dustBytes !== "bigint") {
      throw new Error(`Estimator: wrong dust=${opts.dust}, should be of type bigint but got ${typeof opts.dust}.`);
    }
    const dustFee = opts.dustRelayFeeRate === void 0 ? 3n : opts.dustRelayFeeRate;
    if (typeof dustFee !== "bigint") {
      throw new Error(`Estimator: wrong dustRelayFeeRate=${opts.dustRelayFeeRate}, should be of type bigint but got ${typeof opts.dustRelayFeeRate}.`);
    }
    this.dust = dustBytes * dustFee;
    if (opts.requiredInputs !== void 0 && !Array.isArray(opts.requiredInputs))
      throw new Error(`Estimator: wrong required inputs=${opts.requiredInputs}`);
    const network = opts.network || NETWORK;
    let amount = 0n;
    let baseWeight = 32;
    for (const o of outputs) {
      const script = getScript(o, opts, opts.network);
      baseWeight += 32 + 4 * VarBytes.encode(script).length;
      amount += o.amount;
    }
    if (typeof opts.changeAddress !== "string")
      throw new Error(`Estimator: wrong change address=${opts.changeAddress}`);
    let changeWeight = baseWeight + 32 + 4 * VarBytes.encode(OutScript.encode(Address(network).decode(opts.changeAddress))).length;
    baseWeight += 4 * CompactSizeLen.encode(outputs.length).length;
    changeWeight += 4 * CompactSizeLen.encode(outputs.length + 1).length;
    this.baseWeight = baseWeight;
    this.changeWeight = changeWeight;
    this.amount = amount;
    const allInputs = Array.from(inputs);
    if (opts.requiredInputs) {
      for (let i = 0; i < opts.requiredInputs.length; i++)
        this.requiredIndices.push(allInputs.push(opts.requiredInputs[i]) - 1);
    }
    const inputKeys = /* @__PURE__ */ new Set();
    this.normalizedInputs = allInputs.map((i) => {
      const normalized = normalizeInput(i, void 0, void 0, opts.disableScriptCheck, opts.allowUnknown);
      inputBeforeSign(normalized);
      const key = `${hex.encode(normalized.txid)}:${normalized.index}`;
      if (!opts.allowSameUtxo && inputKeys.has(key))
        throw new Error(`Estimator: same input passed multiple times: ${key}`);
      inputKeys.add(key);
      const inputType = getInputType(normalized, opts.allowLegacyWitnessUtxo);
      const prev = getPrevOut(normalized);
      const estimate = estimateInput(inputType, normalized, this.opts);
      const value = prev.amount - opts.feePerByte * BigInt(toVsize(estimate.weight));
      return { inputType, normalized, amount: prev.amount, value, estimate };
    });
  }
  checkInputIdx(idx) {
    if (!Number.isSafeInteger(idx) || 0 > idx || idx >= this.normalizedInputs.length)
      throw new Error(`Wrong input index=${idx}`);
    return idx;
  }
  sortIndices(indices) {
    return indices.slice().sort((a, b) => {
      const ai = this.normalizedInputs[this.checkInputIdx(a)];
      const bi = this.normalizedInputs[this.checkInputIdx(b)];
      const out = compareBytes(ai.normalized.txid, bi.normalized.txid);
      if (out !== 0)
        return out;
      return ai.normalized.index - bi.normalized.index;
    });
  }
  sortOutputs(outputs) {
    const scripts = outputs.map((o) => getScript(o, this.opts, this.opts.network));
    const indices = outputs.map((_, j) => j);
    return indices.sort((a, b) => {
      const aa = outputs[a].amount;
      const ba = outputs[b].amount;
      const out = _cmpBig(aa, ba);
      if (out !== 0)
        return out;
      return compareBytes(scripts[a], scripts[b]);
    });
  }
  getSatoshi(weigth) {
    return this.opts.feePerByte * BigInt(toVsize(weigth));
  }
  // Sort by value instead of amount
  get biggest() {
    return this.normalizedInputs.map((_i, j) => j).sort((a, b) => _cmpBig(this.normalizedInputs[b].value, this.normalizedInputs[a].value));
  }
  get smallest() {
    return this.biggest.reverse();
  }
  // These assume that UTXO array has historical order.
  // Otherwise, we have no way to know which tx is oldest
  // Explorers usually give UTXO in this order.
  get oldest() {
    return this.normalizedInputs.map((_i, j) => j);
  }
  get newest() {
    return this.oldest.reverse();
  }
  // exact - like blackjack from coinselect.
  // exact(biggest) will select one big utxo which is closer to targetValue+dust, if possible.
  // If not, it will accumulate largest utxo until value is close to targetValue+dust.
  accumulate(indices, exact = false, skipNegative = true, all = false) {
    let weight = this.opts.alwaysChange ? this.changeWeight : this.baseWeight;
    let hasWitnesses = false;
    let num = 0;
    let inputsAmount = 0n;
    const targetAmount = this.amount;
    const res = /* @__PURE__ */ new Set();
    let fee;
    for (const idx of this.requiredIndices) {
      this.checkInputIdx(idx);
      if (res.has(idx))
        throw new Error("required input encountered multiple times");
      const { estimate, amount } = this.normalizedInputs[idx];
      let newWeight = weight + estimate.weight;
      if (!hasWitnesses && estimate.hasWitnesses)
        newWeight += 2;
      const totalWeight = newWeight + 4 * CompactSizeLen.encode(num).length;
      fee = this.getSatoshi(totalWeight);
      weight = newWeight;
      if (estimate.hasWitnesses)
        hasWitnesses = true;
      num++;
      inputsAmount += amount;
      res.add(idx);
      if (!all && targetAmount + fee <= inputsAmount && num >= this.requiredIndices.length)
        return { indices: Array.from(res), fee, weight: totalWeight, total: inputsAmount };
    }
    for (const idx of indices) {
      this.checkInputIdx(idx);
      if (res.has(idx))
        continue;
      const { estimate, amount, value } = this.normalizedInputs[idx];
      let newWeight = weight + estimate.weight;
      if (!hasWitnesses && estimate.hasWitnesses)
        newWeight += 2;
      const totalWeight = newWeight + 4 * CompactSizeLen.encode(num).length;
      fee = this.getSatoshi(totalWeight);
      if (exact && amount + inputsAmount > targetAmount + fee + this.dust)
        continue;
      if (skipNegative && value <= 0n)
        continue;
      weight = newWeight;
      if (estimate.hasWitnesses)
        hasWitnesses = true;
      num++;
      inputsAmount += amount;
      res.add(idx);
      if (!all && targetAmount + fee <= inputsAmount)
        return { indices: Array.from(res), fee, weight: totalWeight, total: inputsAmount };
    }
    if (all) {
      const newWeight = weight + 4 * CompactSizeLen.encode(num).length;
      return { indices: Array.from(res), fee, weight: newWeight, total: inputsAmount };
    }
    return void 0;
  }
  // Works like coinselect default method
  default() {
    const { biggest } = this;
    const exact = this.accumulate(biggest, true, false);
    if (exact)
      return exact;
    return this.accumulate(biggest);
  }
  select(strategy) {
    if (strategy === "all") {
      return this.accumulate(this.normalizedInputs.map((_, j) => j), false, true, true);
    }
    if (strategy === "default")
      return this.default();
    const data = {
      Oldest: () => this.oldest,
      Newest: () => this.newest,
      Smallest: () => this.smallest,
      Biggest: () => this.biggest
    };
    if (strategy.startsWith("exact")) {
      const [exactData, left] = strategy.slice(5).split("/");
      if (!data[exactData])
        throw new Error(`Estimator.select: wrong strategy=${strategy}`);
      strategy = left;
      const exact = this.accumulate(data[exactData](), true, true);
      if (exact)
        return exact;
    }
    if (strategy.startsWith("accum")) {
      const accumData = strategy.slice(5);
      if (!data[accumData])
        throw new Error(`Estimator.select: wrong strategy=${strategy}`);
      return this.accumulate(data[accumData]());
    }
    throw new Error(`Estimator.select: wrong strategy=${strategy}`);
  }
  result(strategy) {
    const s = this.select(strategy);
    if (!s)
      return;
    const { indices, weight, total } = s;
    let needChange = this.opts.alwaysChange;
    const changeWeight = this.opts.alwaysChange ? weight : weight + (this.changeWeight - this.baseWeight);
    const changeFee = this.getSatoshi(changeWeight);
    let fee = s.fee;
    const change = total - this.amount - changeFee;
    if (change > this.dust)
      needChange = true;
    let inputs = indices;
    let outputs = Array.from(this.outputs);
    if (needChange) {
      fee = changeFee;
      if (change < 0n)
        throw new Error(`Estimator.result: negative change=${change}`);
      outputs.push({ address: this.opts.changeAddress, amount: change });
    }
    if (this.opts.bip69) {
      inputs = this.sortIndices(inputs);
      outputs = this.sortOutputs(outputs).map((i) => outputs[i]);
    }
    const res = {
      inputs: inputs.map((i) => this.normalizedInputs[i].normalized),
      outputs,
      fee,
      weight: this.opts.alwaysChange ? s.weight : changeWeight,
      change: !!needChange
    };
    let tx;
    if (this.opts.createTx) {
      const { inputs: inputs2, outputs: outputs2 } = res;
      tx = new Transaction(this.opts);
      for (const i of inputs2)
        tx.addInput(i);
      for (const o of outputs2)
        tx.addOutput({ ...o, script: getScript(o, this.opts, this.opts.network) });
    }
    return Object.assign(res, { tx });
  }
};
function selectUTXO(inputs, outputs, strategy, opts) {
  const _opts = { createTx: true, bip69: true, ...opts };
  const est = new _Estimator(inputs, outputs, _opts);
  return est.result(strategy);
}

// node_modules/@scure/btc-signer/esm/index.js
var utils2 = {
  isBytes: isBytes2,
  concatBytes: concatBytes2,
  compareBytes,
  pubSchnorr,
  randomPrivateKeyBytes,
  taprootTweakPubkey
};
export {
  Address,
  CompactSize,
  DEFAULT_SEQUENCE,
  Decimal,
  MAX_SCRIPT_BYTE_LENGTH,
  NETWORK,
  OP,
  OutScript,
  PSBTCombine,
  RawTx,
  RawWitness,
  Script,
  ScriptNum,
  SigHash,
  TAPROOT_UNSPENDABLE_KEY,
  TEST_NETWORK,
  TaprootControlBlock,
  Transaction,
  WIF,
  _DebugPSBT,
  _Estimator,
  _cmpBig,
  _sortPubkeys,
  bip32Path,
  combinations,
  getAddress,
  getInputType,
  multisig,
  p2ms,
  p2pk,
  p2pkh,
  p2sh,
  p2tr,
  p2tr_ms,
  p2tr_ns,
  p2tr_pk,
  p2wpkh,
  p2wsh,
  selectUTXO,
  sortedMultisig,
  taprootListToTree,
  utils2 as utils
};
/*! Bundled license information:

@scure/btc-signer/esm/index.js:
  (*! scure-btc-signer - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=@scure_btc-signer.js.map
