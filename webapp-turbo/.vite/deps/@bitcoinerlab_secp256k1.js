import {
  require_hmac
} from "./chunk-4ROKUOYT.js";
import {
  require_sha2,
  require_utils
} from "./chunk-PLBP254U.js";
import {
  __commonJS
} from "./chunk-2TUXWMP5.js";

// node_modules/@noble/curves/utils.js
var require_utils2 = __commonJS({
  "node_modules/@noble/curves/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.notImplemented = exports.bitMask = exports.utf8ToBytes = exports.randomBytes = exports.isBytes = exports.hexToBytes = exports.concatBytes = exports.bytesToUtf8 = exports.bytesToHex = exports.anumber = exports.abytes = void 0;
    exports.abool = abool;
    exports._abool2 = _abool2;
    exports._abytes2 = _abytes2;
    exports.numberToHexUnpadded = numberToHexUnpadded;
    exports.hexToNumber = hexToNumber;
    exports.bytesToNumberBE = bytesToNumberBE;
    exports.bytesToNumberLE = bytesToNumberLE;
    exports.numberToBytesBE = numberToBytesBE;
    exports.numberToBytesLE = numberToBytesLE;
    exports.numberToVarBytesBE = numberToVarBytesBE;
    exports.ensureBytes = ensureBytes;
    exports.equalBytes = equalBytes;
    exports.copyBytes = copyBytes;
    exports.asciiToBytes = asciiToBytes;
    exports.inRange = inRange;
    exports.aInRange = aInRange;
    exports.bitLen = bitLen;
    exports.bitGet = bitGet;
    exports.bitSet = bitSet;
    exports.createHmacDrbg = createHmacDrbg;
    exports.validateObject = validateObject;
    exports.isHash = isHash;
    exports._validateObject = _validateObject;
    exports.memoized = memoized;
    var utils_js_1 = require_utils();
    var utils_js_2 = require_utils();
    Object.defineProperty(exports, "abytes", { enumerable: true, get: function() {
      return utils_js_2.abytes;
    } });
    Object.defineProperty(exports, "anumber", { enumerable: true, get: function() {
      return utils_js_2.anumber;
    } });
    Object.defineProperty(exports, "bytesToHex", { enumerable: true, get: function() {
      return utils_js_2.bytesToHex;
    } });
    Object.defineProperty(exports, "bytesToUtf8", { enumerable: true, get: function() {
      return utils_js_2.bytesToUtf8;
    } });
    Object.defineProperty(exports, "concatBytes", { enumerable: true, get: function() {
      return utils_js_2.concatBytes;
    } });
    Object.defineProperty(exports, "hexToBytes", { enumerable: true, get: function() {
      return utils_js_2.hexToBytes;
    } });
    Object.defineProperty(exports, "isBytes", { enumerable: true, get: function() {
      return utils_js_2.isBytes;
    } });
    Object.defineProperty(exports, "randomBytes", { enumerable: true, get: function() {
      return utils_js_2.randomBytes;
    } });
    Object.defineProperty(exports, "utf8ToBytes", { enumerable: true, get: function() {
      return utils_js_2.utf8ToBytes;
    } });
    var _0n = BigInt(0);
    var _1n = BigInt(1);
    function abool(title, value) {
      if (typeof value !== "boolean")
        throw new Error(title + " boolean expected, got " + value);
    }
    function _abool2(value, title = "") {
      if (typeof value !== "boolean") {
        const prefix = title && `"${title}"`;
        throw new Error(prefix + "expected boolean, got type=" + typeof value);
      }
      return value;
    }
    function _abytes2(value, length, title = "") {
      const bytes = (0, utils_js_1.isBytes)(value);
      const len = value == null ? void 0 : value.length;
      const needsLen = length !== void 0;
      if (!bytes || needsLen && len !== length) {
        const prefix = title && `"${title}" `;
        const ofLen = needsLen ? ` of length ${length}` : "";
        const got = bytes ? `length=${len}` : `type=${typeof value}`;
        throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
      }
      return value;
    }
    function numberToHexUnpadded(num) {
      const hex = num.toString(16);
      return hex.length & 1 ? "0" + hex : hex;
    }
    function hexToNumber(hex) {
      if (typeof hex !== "string")
        throw new Error("hex string expected, got " + typeof hex);
      return hex === "" ? _0n : BigInt("0x" + hex);
    }
    function bytesToNumberBE(bytes) {
      return hexToNumber((0, utils_js_1.bytesToHex)(bytes));
    }
    function bytesToNumberLE(bytes) {
      (0, utils_js_1.abytes)(bytes);
      return hexToNumber((0, utils_js_1.bytesToHex)(Uint8Array.from(bytes).reverse()));
    }
    function numberToBytesBE(n, len) {
      return (0, utils_js_1.hexToBytes)(n.toString(16).padStart(len * 2, "0"));
    }
    function numberToBytesLE(n, len) {
      return numberToBytesBE(n, len).reverse();
    }
    function numberToVarBytesBE(n) {
      return (0, utils_js_1.hexToBytes)(numberToHexUnpadded(n));
    }
    function ensureBytes(title, hex, expectedLength) {
      let res;
      if (typeof hex === "string") {
        try {
          res = (0, utils_js_1.hexToBytes)(hex);
        } catch (e) {
          throw new Error(title + " must be hex string or Uint8Array, cause: " + e);
        }
      } else if ((0, utils_js_1.isBytes)(hex)) {
        res = Uint8Array.from(hex);
      } else {
        throw new Error(title + " must be hex string or Uint8Array");
      }
      const len = res.length;
      if (typeof expectedLength === "number" && len !== expectedLength)
        throw new Error(title + " of length " + expectedLength + " expected, got " + len);
      return res;
    }
    function equalBytes(a, b) {
      if (a.length !== b.length)
        return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++)
        diff |= a[i] ^ b[i];
      return diff === 0;
    }
    function copyBytes(bytes) {
      return Uint8Array.from(bytes);
    }
    function asciiToBytes(ascii) {
      return Uint8Array.from(ascii, (c, i) => {
        const charCode = c.charCodeAt(0);
        if (c.length !== 1 || charCode > 127) {
          throw new Error(`string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`);
        }
        return charCode;
      });
    }
    var isPosBig = (n) => typeof n === "bigint" && _0n <= n;
    function inRange(n, min, max) {
      return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
    }
    function aInRange(title, n, min, max) {
      if (!inRange(n, min, max))
        throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
    }
    function bitLen(n) {
      let len;
      for (len = 0; n > _0n; n >>= _1n, len += 1)
        ;
      return len;
    }
    function bitGet(n, pos) {
      return n >> BigInt(pos) & _1n;
    }
    function bitSet(n, pos, value) {
      return n | (value ? _1n : _0n) << BigInt(pos);
    }
    var bitMask = (n) => (_1n << BigInt(n)) - _1n;
    exports.bitMask = bitMask;
    function createHmacDrbg(hashLen, qByteLen, hmacFn) {
      if (typeof hashLen !== "number" || hashLen < 2)
        throw new Error("hashLen must be a number");
      if (typeof qByteLen !== "number" || qByteLen < 2)
        throw new Error("qByteLen must be a number");
      if (typeof hmacFn !== "function")
        throw new Error("hmacFn must be a function");
      const u8n = (len) => new Uint8Array(len);
      const u8of = (byte) => Uint8Array.of(byte);
      let v = u8n(hashLen);
      let k = u8n(hashLen);
      let i = 0;
      const reset = () => {
        v.fill(1);
        k.fill(0);
        i = 0;
      };
      const h = (...b) => hmacFn(k, v, ...b);
      const reseed = (seed = u8n(0)) => {
        k = h(u8of(0), seed);
        v = h();
        if (seed.length === 0)
          return;
        k = h(u8of(1), seed);
        v = h();
      };
      const gen = () => {
        if (i++ >= 1e3)
          throw new Error("drbg: tried 1000 values");
        let len = 0;
        const out = [];
        while (len < qByteLen) {
          v = h();
          const sl = v.slice();
          out.push(sl);
          len += v.length;
        }
        return (0, utils_js_1.concatBytes)(...out);
      };
      const genUntil = (seed, pred) => {
        reset();
        reseed(seed);
        let res = void 0;
        while (!(res = pred(gen())))
          reseed();
        reset();
        return res;
      };
      return genUntil;
    }
    var validatorFns = {
      bigint: (val) => typeof val === "bigint",
      function: (val) => typeof val === "function",
      boolean: (val) => typeof val === "boolean",
      string: (val) => typeof val === "string",
      stringOrUint8Array: (val) => typeof val === "string" || (0, utils_js_1.isBytes)(val),
      isSafeInteger: (val) => Number.isSafeInteger(val),
      array: (val) => Array.isArray(val),
      field: (val, object) => object.Fp.isValid(val),
      hash: (val) => typeof val === "function" && Number.isSafeInteger(val.outputLen)
    };
    function validateObject(object, validators, optValidators = {}) {
      const checkField = (fieldName, type, isOptional) => {
        const checkVal = validatorFns[type];
        if (typeof checkVal !== "function")
          throw new Error("invalid validator function");
        const val = object[fieldName];
        if (isOptional && val === void 0)
          return;
        if (!checkVal(val, object)) {
          throw new Error("param " + String(fieldName) + " is invalid. Expected " + type + ", got " + val);
        }
      };
      for (const [fieldName, type] of Object.entries(validators))
        checkField(fieldName, type, false);
      for (const [fieldName, type] of Object.entries(optValidators))
        checkField(fieldName, type, true);
      return object;
    }
    function isHash(val) {
      return typeof val === "function" && Number.isSafeInteger(val.outputLen);
    }
    function _validateObject(object, fields, optFields = {}) {
      if (!object || typeof object !== "object")
        throw new Error("expected valid options object");
      function checkField(fieldName, expectedType, isOpt) {
        const val = object[fieldName];
        if (isOpt && val === void 0)
          return;
        const current = typeof val;
        if (current !== expectedType || val === null)
          throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
      }
      Object.entries(fields).forEach(([k, v]) => checkField(k, v, false));
      Object.entries(optFields).forEach(([k, v]) => checkField(k, v, true));
    }
    var notImplemented = () => {
      throw new Error("not implemented");
    };
    exports.notImplemented = notImplemented;
    function memoized(fn) {
      const map = /* @__PURE__ */ new WeakMap();
      return (arg, ...args) => {
        const val = map.get(arg);
        if (val !== void 0)
          return val;
        const computed = fn(arg, ...args);
        map.set(arg, computed);
        return computed;
      };
    }
  }
});

// node_modules/@noble/curves/abstract/modular.js
var require_modular = __commonJS({
  "node_modules/@noble/curves/abstract/modular.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isNegativeLE = void 0;
    exports.mod = mod;
    exports.pow = pow;
    exports.pow2 = pow2;
    exports.invert = invert;
    exports.tonelliShanks = tonelliShanks;
    exports.FpSqrt = FpSqrt;
    exports.validateField = validateField;
    exports.FpPow = FpPow;
    exports.FpInvertBatch = FpInvertBatch;
    exports.FpDiv = FpDiv;
    exports.FpLegendre = FpLegendre;
    exports.FpIsSquare = FpIsSquare;
    exports.nLength = nLength;
    exports.Field = Field;
    exports.FpSqrtOdd = FpSqrtOdd;
    exports.FpSqrtEven = FpSqrtEven;
    exports.hashToPrivateScalar = hashToPrivateScalar;
    exports.getFieldBytesLength = getFieldBytesLength;
    exports.getMinHashLength = getMinHashLength;
    exports.mapHashToField = mapHashToField;
    var utils_ts_1 = require_utils2();
    var _0n = BigInt(0);
    var _1n = BigInt(1);
    var _2n = BigInt(2);
    var _3n = BigInt(3);
    var _4n = BigInt(4);
    var _5n = BigInt(5);
    var _7n = BigInt(7);
    var _8n = BigInt(8);
    var _9n = BigInt(9);
    var _16n = BigInt(16);
    function mod(a, b) {
      const result = a % b;
      return result >= _0n ? result : b + result;
    }
    function pow(num, power, modulo) {
      return FpPow(Field(modulo), num, power);
    }
    function pow2(x, power, modulo) {
      let res = x;
      while (power-- > _0n) {
        res *= res;
        res %= modulo;
      }
      return res;
    }
    function invert(number, modulo) {
      if (number === _0n)
        throw new Error("invert: expected non-zero number");
      if (modulo <= _0n)
        throw new Error("invert: expected positive modulus, got " + modulo);
      let a = mod(number, modulo);
      let b = modulo;
      let x = _0n, y = _1n, u = _1n, v = _0n;
      while (a !== _0n) {
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        const n = y - v * q;
        b = a, a = r, x = u, y = v, u = m, v = n;
      }
      const gcd = b;
      if (gcd !== _1n)
        throw new Error("invert: does not exist");
      return mod(x, modulo);
    }
    function assertIsSquare(Fp, root, n) {
      if (!Fp.eql(Fp.sqr(root), n))
        throw new Error("Cannot find square root");
    }
    function sqrt3mod4(Fp, n) {
      const p1div4 = (Fp.ORDER + _1n) / _4n;
      const root = Fp.pow(n, p1div4);
      assertIsSquare(Fp, root, n);
      return root;
    }
    function sqrt5mod8(Fp, n) {
      const p5div8 = (Fp.ORDER - _5n) / _8n;
      const n2 = Fp.mul(n, _2n);
      const v = Fp.pow(n2, p5div8);
      const nv = Fp.mul(n, v);
      const i = Fp.mul(Fp.mul(nv, _2n), v);
      const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
      assertIsSquare(Fp, root, n);
      return root;
    }
    function sqrt9mod16(P) {
      const Fp_ = Field(P);
      const tn = tonelliShanks(P);
      const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
      const c2 = tn(Fp_, c1);
      const c3 = tn(Fp_, Fp_.neg(c1));
      const c4 = (P + _7n) / _16n;
      return (Fp, n) => {
        let tv1 = Fp.pow(n, c4);
        let tv2 = Fp.mul(tv1, c1);
        const tv3 = Fp.mul(tv1, c2);
        const tv4 = Fp.mul(tv1, c3);
        const e1 = Fp.eql(Fp.sqr(tv2), n);
        const e2 = Fp.eql(Fp.sqr(tv3), n);
        tv1 = Fp.cmov(tv1, tv2, e1);
        tv2 = Fp.cmov(tv4, tv3, e2);
        const e3 = Fp.eql(Fp.sqr(tv2), n);
        const root = Fp.cmov(tv1, tv2, e3);
        assertIsSquare(Fp, root, n);
        return root;
      };
    }
    function tonelliShanks(P) {
      if (P < _3n)
        throw new Error("sqrt is not defined for small field");
      let Q = P - _1n;
      let S = 0;
      while (Q % _2n === _0n) {
        Q /= _2n;
        S++;
      }
      let Z = _2n;
      const _Fp = Field(P);
      while (FpLegendre(_Fp, Z) === 1) {
        if (Z++ > 1e3)
          throw new Error("Cannot find square root: probably non-prime P");
      }
      if (S === 1)
        return sqrt3mod4;
      let cc = _Fp.pow(Z, Q);
      const Q1div2 = (Q + _1n) / _2n;
      return function tonelliSlow(Fp, n) {
        if (Fp.is0(n))
          return n;
        if (FpLegendre(Fp, n) !== 1)
          throw new Error("Cannot find square root");
        let M = S;
        let c = Fp.mul(Fp.ONE, cc);
        let t = Fp.pow(n, Q);
        let R = Fp.pow(n, Q1div2);
        while (!Fp.eql(t, Fp.ONE)) {
          if (Fp.is0(t))
            return Fp.ZERO;
          let i = 1;
          let t_tmp = Fp.sqr(t);
          while (!Fp.eql(t_tmp, Fp.ONE)) {
            i++;
            t_tmp = Fp.sqr(t_tmp);
            if (i === M)
              throw new Error("Cannot find square root");
          }
          const exponent = _1n << BigInt(M - i - 1);
          const b = Fp.pow(c, exponent);
          M = i;
          c = Fp.sqr(b);
          t = Fp.mul(t, c);
          R = Fp.mul(R, b);
        }
        return R;
      };
    }
    function FpSqrt(P) {
      if (P % _4n === _3n)
        return sqrt3mod4;
      if (P % _8n === _5n)
        return sqrt5mod8;
      if (P % _16n === _9n)
        return sqrt9mod16(P);
      return tonelliShanks(P);
    }
    var isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n) === _1n;
    exports.isNegativeLE = isNegativeLE;
    var FIELD_FIELDS = [
      "create",
      "isValid",
      "is0",
      "neg",
      "inv",
      "sqrt",
      "sqr",
      "eql",
      "add",
      "sub",
      "mul",
      "pow",
      "div",
      "addN",
      "subN",
      "mulN",
      "sqrN"
    ];
    function validateField(field) {
      const initial = {
        ORDER: "bigint",
        MASK: "bigint",
        BYTES: "number",
        BITS: "number"
      };
      const opts = FIELD_FIELDS.reduce((map, val) => {
        map[val] = "function";
        return map;
      }, initial);
      (0, utils_ts_1._validateObject)(field, opts);
      return field;
    }
    function FpPow(Fp, num, power) {
      if (power < _0n)
        throw new Error("invalid exponent, negatives unsupported");
      if (power === _0n)
        return Fp.ONE;
      if (power === _1n)
        return num;
      let p = Fp.ONE;
      let d = num;
      while (power > _0n) {
        if (power & _1n)
          p = Fp.mul(p, d);
        d = Fp.sqr(d);
        power >>= _1n;
      }
      return p;
    }
    function FpInvertBatch(Fp, nums, passZero = false) {
      const inverted = new Array(nums.length).fill(passZero ? Fp.ZERO : void 0);
      const multipliedAcc = nums.reduce((acc, num, i) => {
        if (Fp.is0(num))
          return acc;
        inverted[i] = acc;
        return Fp.mul(acc, num);
      }, Fp.ONE);
      const invertedAcc = Fp.inv(multipliedAcc);
      nums.reduceRight((acc, num, i) => {
        if (Fp.is0(num))
          return acc;
        inverted[i] = Fp.mul(acc, inverted[i]);
        return Fp.mul(acc, num);
      }, invertedAcc);
      return inverted;
    }
    function FpDiv(Fp, lhs, rhs) {
      return Fp.mul(lhs, typeof rhs === "bigint" ? invert(rhs, Fp.ORDER) : Fp.inv(rhs));
    }
    function FpLegendre(Fp, n) {
      const p1mod2 = (Fp.ORDER - _1n) / _2n;
      const powered = Fp.pow(n, p1mod2);
      const yes = Fp.eql(powered, Fp.ONE);
      const zero = Fp.eql(powered, Fp.ZERO);
      const no = Fp.eql(powered, Fp.neg(Fp.ONE));
      if (!yes && !zero && !no)
        throw new Error("invalid Legendre symbol result");
      return yes ? 1 : zero ? 0 : -1;
    }
    function FpIsSquare(Fp, n) {
      const l = FpLegendre(Fp, n);
      return l === 1;
    }
    function nLength(n, nBitLength) {
      if (nBitLength !== void 0)
        (0, utils_ts_1.anumber)(nBitLength);
      const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
      const nByteLength = Math.ceil(_nBitLength / 8);
      return { nBitLength: _nBitLength, nByteLength };
    }
    function Field(ORDER, bitLenOrOpts, isLE = false, opts = {}) {
      if (ORDER <= _0n)
        throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
      let _nbitLength = void 0;
      let _sqrt = void 0;
      let modFromBytes = false;
      let allowedLengths = void 0;
      if (typeof bitLenOrOpts === "object" && bitLenOrOpts != null) {
        if (opts.sqrt || isLE)
          throw new Error("cannot specify opts in two arguments");
        const _opts = bitLenOrOpts;
        if (_opts.BITS)
          _nbitLength = _opts.BITS;
        if (_opts.sqrt)
          _sqrt = _opts.sqrt;
        if (typeof _opts.isLE === "boolean")
          isLE = _opts.isLE;
        if (typeof _opts.modFromBytes === "boolean")
          modFromBytes = _opts.modFromBytes;
        allowedLengths = _opts.allowedLengths;
      } else {
        if (typeof bitLenOrOpts === "number")
          _nbitLength = bitLenOrOpts;
        if (opts.sqrt)
          _sqrt = opts.sqrt;
      }
      const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, _nbitLength);
      if (BYTES > 2048)
        throw new Error("invalid field: expected ORDER of <= 2048 bytes");
      let sqrtP;
      const f = Object.freeze({
        ORDER,
        isLE,
        BITS,
        BYTES,
        MASK: (0, utils_ts_1.bitMask)(BITS),
        ZERO: _0n,
        ONE: _1n,
        allowedLengths,
        create: (num) => mod(num, ORDER),
        isValid: (num) => {
          if (typeof num !== "bigint")
            throw new Error("invalid field element: expected bigint, got " + typeof num);
          return _0n <= num && num < ORDER;
        },
        is0: (num) => num === _0n,
        // is valid and invertible
        isValidNot0: (num) => !f.is0(num) && f.isValid(num),
        isOdd: (num) => (num & _1n) === _1n,
        neg: (num) => mod(-num, ORDER),
        eql: (lhs, rhs) => lhs === rhs,
        sqr: (num) => mod(num * num, ORDER),
        add: (lhs, rhs) => mod(lhs + rhs, ORDER),
        sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
        mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
        pow: (num, power) => FpPow(f, num, power),
        div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
        // Same as above, but doesn't normalize
        sqrN: (num) => num * num,
        addN: (lhs, rhs) => lhs + rhs,
        subN: (lhs, rhs) => lhs - rhs,
        mulN: (lhs, rhs) => lhs * rhs,
        inv: (num) => invert(num, ORDER),
        sqrt: _sqrt || ((n) => {
          if (!sqrtP)
            sqrtP = FpSqrt(ORDER);
          return sqrtP(f, n);
        }),
        toBytes: (num) => isLE ? (0, utils_ts_1.numberToBytesLE)(num, BYTES) : (0, utils_ts_1.numberToBytesBE)(num, BYTES),
        fromBytes: (bytes, skipValidation = true) => {
          if (allowedLengths) {
            if (!allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
              throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
            }
            const padded = new Uint8Array(BYTES);
            padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
            bytes = padded;
          }
          if (bytes.length !== BYTES)
            throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
          let scalar = isLE ? (0, utils_ts_1.bytesToNumberLE)(bytes) : (0, utils_ts_1.bytesToNumberBE)(bytes);
          if (modFromBytes)
            scalar = mod(scalar, ORDER);
          if (!skipValidation) {
            if (!f.isValid(scalar))
              throw new Error("invalid field element: outside of range 0..ORDER");
          }
          return scalar;
        },
        // TODO: we don't need it here, move out to separate fn
        invertBatch: (lst) => FpInvertBatch(f, lst),
        // We can't move this out because Fp6, Fp12 implement it
        // and it's unclear what to return in there.
        cmov: (a, b, c) => c ? b : a
      });
      return Object.freeze(f);
    }
    function FpSqrtOdd(Fp, elm) {
      if (!Fp.isOdd)
        throw new Error("Field doesn't have isOdd");
      const root = Fp.sqrt(elm);
      return Fp.isOdd(root) ? root : Fp.neg(root);
    }
    function FpSqrtEven(Fp, elm) {
      if (!Fp.isOdd)
        throw new Error("Field doesn't have isOdd");
      const root = Fp.sqrt(elm);
      return Fp.isOdd(root) ? Fp.neg(root) : root;
    }
    function hashToPrivateScalar(hash, groupOrder, isLE = false) {
      hash = (0, utils_ts_1.ensureBytes)("privateHash", hash);
      const hashLen = hash.length;
      const minLen = nLength(groupOrder).nByteLength + 8;
      if (minLen < 24 || hashLen < minLen || hashLen > 1024)
        throw new Error("hashToPrivateScalar: expected " + minLen + "-1024 bytes of input, got " + hashLen);
      const num = isLE ? (0, utils_ts_1.bytesToNumberLE)(hash) : (0, utils_ts_1.bytesToNumberBE)(hash);
      return mod(num, groupOrder - _1n) + _1n;
    }
    function getFieldBytesLength(fieldOrder) {
      if (typeof fieldOrder !== "bigint")
        throw new Error("field order must be bigint");
      const bitLength = fieldOrder.toString(2).length;
      return Math.ceil(bitLength / 8);
    }
    function getMinHashLength(fieldOrder) {
      const length = getFieldBytesLength(fieldOrder);
      return length + Math.ceil(length / 2);
    }
    function mapHashToField(key, fieldOrder, isLE = false) {
      const len = key.length;
      const fieldLen = getFieldBytesLength(fieldOrder);
      const minLen = getMinHashLength(fieldOrder);
      if (len < 16 || len < minLen || len > 1024)
        throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
      const num = isLE ? (0, utils_ts_1.bytesToNumberLE)(key) : (0, utils_ts_1.bytesToNumberBE)(key);
      const reduced = mod(num, fieldOrder - _1n) + _1n;
      return isLE ? (0, utils_ts_1.numberToBytesLE)(reduced, fieldLen) : (0, utils_ts_1.numberToBytesBE)(reduced, fieldLen);
    }
  }
});

// node_modules/@noble/curves/abstract/curve.js
var require_curve = __commonJS({
  "node_modules/@noble/curves/abstract/curve.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.wNAF = void 0;
    exports.negateCt = negateCt;
    exports.normalizeZ = normalizeZ;
    exports.mulEndoUnsafe = mulEndoUnsafe;
    exports.pippenger = pippenger;
    exports.precomputeMSMUnsafe = precomputeMSMUnsafe;
    exports.validateBasic = validateBasic;
    exports._createCurveFields = _createCurveFields;
    var utils_ts_1 = require_utils2();
    var modular_ts_1 = require_modular();
    var _0n = BigInt(0);
    var _1n = BigInt(1);
    function negateCt(condition, item) {
      const neg = item.negate();
      return condition ? neg : item;
    }
    function normalizeZ(c, points) {
      const invertedZs = (0, modular_ts_1.FpInvertBatch)(c.Fp, points.map((p) => p.Z));
      return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
    }
    function validateW(W, bits) {
      if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
        throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
    }
    function calcWOpts(W, scalarBits) {
      validateW(W, scalarBits);
      const windows = Math.ceil(scalarBits / W) + 1;
      const windowSize = 2 ** (W - 1);
      const maxNumber = 2 ** W;
      const mask = (0, utils_ts_1.bitMask)(W);
      const shiftBy = BigInt(W);
      return { windows, windowSize, mask, maxNumber, shiftBy };
    }
    function calcOffsets(n, window, wOpts) {
      const { windowSize, mask, maxNumber, shiftBy } = wOpts;
      let wbits = Number(n & mask);
      let nextN = n >> shiftBy;
      if (wbits > windowSize) {
        wbits -= maxNumber;
        nextN += _1n;
      }
      const offsetStart = window * windowSize;
      const offset = offsetStart + Math.abs(wbits) - 1;
      const isZero = wbits === 0;
      const isNeg = wbits < 0;
      const isNegF = window % 2 !== 0;
      const offsetF = offsetStart;
      return { nextN, offset, isZero, isNeg, isNegF, offsetF };
    }
    function validateMSMPoints(points, c) {
      if (!Array.isArray(points))
        throw new Error("array expected");
      points.forEach((p, i) => {
        if (!(p instanceof c))
          throw new Error("invalid point at index " + i);
      });
    }
    function validateMSMScalars(scalars, field) {
      if (!Array.isArray(scalars))
        throw new Error("array of scalars expected");
      scalars.forEach((s, i) => {
        if (!field.isValid(s))
          throw new Error("invalid scalar at index " + i);
      });
    }
    var pointPrecomputes = /* @__PURE__ */ new WeakMap();
    var pointWindowSizes = /* @__PURE__ */ new WeakMap();
    function getW(P) {
      return pointWindowSizes.get(P) || 1;
    }
    function assert0(n) {
      if (n !== _0n)
        throw new Error("invalid wNAF");
    }
    var wNAF = class {
      // Parametrized with a given Point class (not individual point)
      constructor(Point, bits) {
        this.BASE = Point.BASE;
        this.ZERO = Point.ZERO;
        this.Fn = Point.Fn;
        this.bits = bits;
      }
      // non-const time multiplication ladder
      _unsafeLadder(elm, n, p = this.ZERO) {
        let d = elm;
        while (n > _0n) {
          if (n & _1n)
            p = p.add(d);
          d = d.double();
          n >>= _1n;
        }
        return p;
      }
      /**
       * Creates a wNAF precomputation window. Used for caching.
       * Default window size is set by `utils.precompute()` and is equal to 8.
       * Number of precomputed points depends on the curve size:
       * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
       * - 𝑊 is the window size
       * - 𝑛 is the bitlength of the curve order.
       * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
       * @param point Point instance
       * @param W window size
       * @returns precomputed point tables flattened to a single array
       */
      precomputeWindow(point, W) {
        const { windows, windowSize } = calcWOpts(W, this.bits);
        const points = [];
        let p = point;
        let base = p;
        for (let window = 0; window < windows; window++) {
          base = p;
          points.push(base);
          for (let i = 1; i < windowSize; i++) {
            base = base.add(p);
            points.push(base);
          }
          p = base.double();
        }
        return points;
      }
      /**
       * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
       * More compact implementation:
       * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
       * @returns real and fake (for const-time) points
       */
      wNAF(W, precomputes, n) {
        if (!this.Fn.isValid(n))
          throw new Error("invalid scalar");
        let p = this.ZERO;
        let f = this.BASE;
        const wo = calcWOpts(W, this.bits);
        for (let window = 0; window < wo.windows; window++) {
          const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
          n = nextN;
          if (isZero) {
            f = f.add(negateCt(isNegF, precomputes[offsetF]));
          } else {
            p = p.add(negateCt(isNeg, precomputes[offset]));
          }
        }
        assert0(n);
        return { p, f };
      }
      /**
       * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
       * @param acc accumulator point to add result of multiplication
       * @returns point
       */
      wNAFUnsafe(W, precomputes, n, acc = this.ZERO) {
        const wo = calcWOpts(W, this.bits);
        for (let window = 0; window < wo.windows; window++) {
          if (n === _0n)
            break;
          const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
          n = nextN;
          if (isZero) {
            continue;
          } else {
            const item = precomputes[offset];
            acc = acc.add(isNeg ? item.negate() : item);
          }
        }
        assert0(n);
        return acc;
      }
      getPrecomputes(W, point, transform) {
        let comp = pointPrecomputes.get(point);
        if (!comp) {
          comp = this.precomputeWindow(point, W);
          if (W !== 1) {
            if (typeof transform === "function")
              comp = transform(comp);
            pointPrecomputes.set(point, comp);
          }
        }
        return comp;
      }
      cached(point, scalar, transform) {
        const W = getW(point);
        return this.wNAF(W, this.getPrecomputes(W, point, transform), scalar);
      }
      unsafe(point, scalar, transform, prev) {
        const W = getW(point);
        if (W === 1)
          return this._unsafeLadder(point, scalar, prev);
        return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform), scalar, prev);
      }
      // We calculate precomputes for elliptic curve point multiplication
      // using windowed method. This specifies window size and
      // stores precomputed values. Usually only base point would be precomputed.
      createCache(P, W) {
        validateW(W, this.bits);
        pointWindowSizes.set(P, W);
        pointPrecomputes.delete(P);
      }
      hasCache(elm) {
        return getW(elm) !== 1;
      }
    };
    exports.wNAF = wNAF;
    function mulEndoUnsafe(Point, point, k1, k2) {
      let acc = point;
      let p1 = Point.ZERO;
      let p2 = Point.ZERO;
      while (k1 > _0n || k2 > _0n) {
        if (k1 & _1n)
          p1 = p1.add(acc);
        if (k2 & _1n)
          p2 = p2.add(acc);
        acc = acc.double();
        k1 >>= _1n;
        k2 >>= _1n;
      }
      return { p1, p2 };
    }
    function pippenger(c, fieldN, points, scalars) {
      validateMSMPoints(points, c);
      validateMSMScalars(scalars, fieldN);
      const plength = points.length;
      const slength = scalars.length;
      if (plength !== slength)
        throw new Error("arrays of points and scalars must have equal length");
      const zero = c.ZERO;
      const wbits = (0, utils_ts_1.bitLen)(BigInt(plength));
      let windowSize = 1;
      if (wbits > 12)
        windowSize = wbits - 3;
      else if (wbits > 4)
        windowSize = wbits - 2;
      else if (wbits > 0)
        windowSize = 2;
      const MASK = (0, utils_ts_1.bitMask)(windowSize);
      const buckets = new Array(Number(MASK) + 1).fill(zero);
      const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
      let sum = zero;
      for (let i = lastBits; i >= 0; i -= windowSize) {
        buckets.fill(zero);
        for (let j = 0; j < slength; j++) {
          const scalar = scalars[j];
          const wbits2 = Number(scalar >> BigInt(i) & MASK);
          buckets[wbits2] = buckets[wbits2].add(points[j]);
        }
        let resI = zero;
        for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
          sumI = sumI.add(buckets[j]);
          resI = resI.add(sumI);
        }
        sum = sum.add(resI);
        if (i !== 0)
          for (let j = 0; j < windowSize; j++)
            sum = sum.double();
      }
      return sum;
    }
    function precomputeMSMUnsafe(c, fieldN, points, windowSize) {
      validateW(windowSize, fieldN.BITS);
      validateMSMPoints(points, c);
      const zero = c.ZERO;
      const tableSize = 2 ** windowSize - 1;
      const chunks = Math.ceil(fieldN.BITS / windowSize);
      const MASK = (0, utils_ts_1.bitMask)(windowSize);
      const tables = points.map((p) => {
        const res = [];
        for (let i = 0, acc = p; i < tableSize; i++) {
          res.push(acc);
          acc = acc.add(p);
        }
        return res;
      });
      return (scalars) => {
        validateMSMScalars(scalars, fieldN);
        if (scalars.length > points.length)
          throw new Error("array of scalars must be smaller than array of points");
        let res = zero;
        for (let i = 0; i < chunks; i++) {
          if (res !== zero)
            for (let j = 0; j < windowSize; j++)
              res = res.double();
          const shiftBy = BigInt(chunks * windowSize - (i + 1) * windowSize);
          for (let j = 0; j < scalars.length; j++) {
            const n = scalars[j];
            const curr = Number(n >> shiftBy & MASK);
            if (!curr)
              continue;
            res = res.add(tables[j][curr - 1]);
          }
        }
        return res;
      };
    }
    function validateBasic(curve) {
      (0, modular_ts_1.validateField)(curve.Fp);
      (0, utils_ts_1.validateObject)(curve, {
        n: "bigint",
        h: "bigint",
        Gx: "field",
        Gy: "field"
      }, {
        nBitLength: "isSafeInteger",
        nByteLength: "isSafeInteger"
      });
      return Object.freeze({
        ...(0, modular_ts_1.nLength)(curve.n, curve.nBitLength),
        ...curve,
        ...{ p: curve.Fp.ORDER }
      });
    }
    function createField(order, field, isLE) {
      if (field) {
        if (field.ORDER !== order)
          throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
        (0, modular_ts_1.validateField)(field);
        return field;
      } else {
        return (0, modular_ts_1.Field)(order, { isLE });
      }
    }
    function _createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
      if (FpFnLE === void 0)
        FpFnLE = type === "edwards";
      if (!CURVE || typeof CURVE !== "object")
        throw new Error(`expected valid ${type} CURVE object`);
      for (const p of ["p", "n", "h"]) {
        const val = CURVE[p];
        if (!(typeof val === "bigint" && val > _0n))
          throw new Error(`CURVE.${p} must be positive bigint`);
      }
      const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
      const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
      const _b = type === "weierstrass" ? "b" : "d";
      const params = ["Gx", "Gy", "a", _b];
      for (const p of params) {
        if (!Fp.isValid(CURVE[p]))
          throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
      }
      CURVE = Object.freeze(Object.assign({}, CURVE));
      return { CURVE, Fp, Fn };
    }
  }
});

// node_modules/@noble/curves/abstract/weierstrass.js
var require_weierstrass = __commonJS({
  "node_modules/@noble/curves/abstract/weierstrass.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DER = exports.DERErr = void 0;
    exports._splitEndoScalar = _splitEndoScalar;
    exports._normFnElement = _normFnElement;
    exports.weierstrassN = weierstrassN;
    exports.SWUFpSqrtRatio = SWUFpSqrtRatio;
    exports.mapToCurveSimpleSWU = mapToCurveSimpleSWU;
    exports.ecdh = ecdh;
    exports.ecdsa = ecdsa;
    exports.weierstrassPoints = weierstrassPoints;
    exports._legacyHelperEquat = _legacyHelperEquat;
    exports.weierstrass = weierstrass;
    var hmac_js_1 = require_hmac();
    var utils_1 = require_utils();
    var utils_ts_1 = require_utils2();
    var curve_ts_1 = require_curve();
    var modular_ts_1 = require_modular();
    var divNearest = (num, den) => (num + (num >= 0 ? den : -den) / _2n) / den;
    function _splitEndoScalar(k, basis, n) {
      const [[a1, b1], [a2, b2]] = basis;
      const c1 = divNearest(b2 * k, n);
      const c2 = divNearest(-b1 * k, n);
      let k1 = k - c1 * a1 - c2 * a2;
      let k2 = -c1 * b1 - c2 * b2;
      const k1neg = k1 < _0n;
      const k2neg = k2 < _0n;
      if (k1neg)
        k1 = -k1;
      if (k2neg)
        k2 = -k2;
      const MAX_NUM = (0, utils_ts_1.bitMask)(Math.ceil((0, utils_ts_1.bitLen)(n) / 2)) + _1n;
      if (k1 < _0n || k1 >= MAX_NUM || k2 < _0n || k2 >= MAX_NUM) {
        throw new Error("splitScalar (endomorphism): failed, k=" + k);
      }
      return { k1neg, k1, k2neg, k2 };
    }
    function validateSigFormat(format) {
      if (!["compact", "recovered", "der"].includes(format))
        throw new Error('Signature format must be "compact", "recovered", or "der"');
      return format;
    }
    function validateSigOpts(opts, def) {
      const optsn = {};
      for (let optName of Object.keys(def)) {
        optsn[optName] = opts[optName] === void 0 ? def[optName] : opts[optName];
      }
      (0, utils_ts_1._abool2)(optsn.lowS, "lowS");
      (0, utils_ts_1._abool2)(optsn.prehash, "prehash");
      if (optsn.format !== void 0)
        validateSigFormat(optsn.format);
      return optsn;
    }
    var DERErr = class extends Error {
      constructor(m = "") {
        super(m);
      }
    };
    exports.DERErr = DERErr;
    exports.DER = {
      // asn.1 DER encoding utils
      Err: DERErr,
      // Basic building block is TLV (Tag-Length-Value)
      _tlv: {
        encode: (tag, data) => {
          const { Err: E } = exports.DER;
          if (tag < 0 || tag > 256)
            throw new E("tlv.encode: wrong tag");
          if (data.length & 1)
            throw new E("tlv.encode: unpadded data");
          const dataLen = data.length / 2;
          const len = (0, utils_ts_1.numberToHexUnpadded)(dataLen);
          if (len.length / 2 & 128)
            throw new E("tlv.encode: long form length too big");
          const lenLen = dataLen > 127 ? (0, utils_ts_1.numberToHexUnpadded)(len.length / 2 | 128) : "";
          const t = (0, utils_ts_1.numberToHexUnpadded)(tag);
          return t + lenLen + len + data;
        },
        // v - value, l - left bytes (unparsed)
        decode(tag, data) {
          const { Err: E } = exports.DER;
          let pos = 0;
          if (tag < 0 || tag > 256)
            throw new E("tlv.encode: wrong tag");
          if (data.length < 2 || data[pos++] !== tag)
            throw new E("tlv.decode: wrong tlv");
          const first = data[pos++];
          const isLong = !!(first & 128);
          let length = 0;
          if (!isLong)
            length = first;
          else {
            const lenLen = first & 127;
            if (!lenLen)
              throw new E("tlv.decode(long): indefinite length not supported");
            if (lenLen > 4)
              throw new E("tlv.decode(long): byte length is too big");
            const lengthBytes = data.subarray(pos, pos + lenLen);
            if (lengthBytes.length !== lenLen)
              throw new E("tlv.decode: length bytes not complete");
            if (lengthBytes[0] === 0)
              throw new E("tlv.decode(long): zero leftmost byte");
            for (const b of lengthBytes)
              length = length << 8 | b;
            pos += lenLen;
            if (length < 128)
              throw new E("tlv.decode(long): not minimal encoding");
          }
          const v = data.subarray(pos, pos + length);
          if (v.length !== length)
            throw new E("tlv.decode: wrong value length");
          return { v, l: data.subarray(pos + length) };
        }
      },
      // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
      // since we always use positive integers here. It must always be empty:
      // - add zero byte if exists
      // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
      _int: {
        encode(num) {
          const { Err: E } = exports.DER;
          if (num < _0n)
            throw new E("integer: negative integers are not allowed");
          let hex = (0, utils_ts_1.numberToHexUnpadded)(num);
          if (Number.parseInt(hex[0], 16) & 8)
            hex = "00" + hex;
          if (hex.length & 1)
            throw new E("unexpected DER parsing assertion: unpadded hex");
          return hex;
        },
        decode(data) {
          const { Err: E } = exports.DER;
          if (data[0] & 128)
            throw new E("invalid signature integer: negative");
          if (data[0] === 0 && !(data[1] & 128))
            throw new E("invalid signature integer: unnecessary leading zero");
          return (0, utils_ts_1.bytesToNumberBE)(data);
        }
      },
      toSig(hex) {
        const { Err: E, _int: int, _tlv: tlv } = exports.DER;
        const data = (0, utils_ts_1.ensureBytes)("signature", hex);
        const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
        if (seqLeftBytes.length)
          throw new E("invalid signature: left bytes after parsing");
        const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
        const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
        if (sLeftBytes.length)
          throw new E("invalid signature: left bytes after parsing");
        return { r: int.decode(rBytes), s: int.decode(sBytes) };
      },
      hexFromSig(sig) {
        const { _tlv: tlv, _int: int } = exports.DER;
        const rs = tlv.encode(2, int.encode(sig.r));
        const ss = tlv.encode(2, int.encode(sig.s));
        const seq = rs + ss;
        return tlv.encode(48, seq);
      }
    };
    var _0n = BigInt(0);
    var _1n = BigInt(1);
    var _2n = BigInt(2);
    var _3n = BigInt(3);
    var _4n = BigInt(4);
    function _normFnElement(Fn, key) {
      const { BYTES: expected } = Fn;
      let num;
      if (typeof key === "bigint") {
        num = key;
      } else {
        let bytes = (0, utils_ts_1.ensureBytes)("private key", key);
        try {
          num = Fn.fromBytes(bytes);
        } catch (error) {
          throw new Error(`invalid private key: expected ui8a of size ${expected}, got ${typeof key}`);
        }
      }
      if (!Fn.isValidNot0(num))
        throw new Error("invalid private key: out of range [1..N-1]");
      return num;
    }
    function weierstrassN(params, extraOpts = {}) {
      const validated = (0, curve_ts_1._createCurveFields)("weierstrass", params, extraOpts);
      const { Fp, Fn } = validated;
      let CURVE = validated.CURVE;
      const { h: cofactor, n: CURVE_ORDER } = CURVE;
      (0, utils_ts_1._validateObject)(extraOpts, {}, {
        allowInfinityPoint: "boolean",
        clearCofactor: "function",
        isTorsionFree: "function",
        fromBytes: "function",
        toBytes: "function",
        endo: "object",
        wrapPrivateKey: "boolean"
      });
      const { endo } = extraOpts;
      if (endo) {
        if (!Fp.is0(CURVE.a) || typeof endo.beta !== "bigint" || !Array.isArray(endo.basises)) {
          throw new Error('invalid endo: expected "beta": bigint and "basises": array');
        }
      }
      const lengths = getWLengths(Fp, Fn);
      function assertCompressionIsSupported() {
        if (!Fp.isOdd)
          throw new Error("compression is not supported: Field does not have .isOdd()");
      }
      function pointToBytes(_c, point, isCompressed) {
        const { x, y } = point.toAffine();
        const bx = Fp.toBytes(x);
        (0, utils_ts_1._abool2)(isCompressed, "isCompressed");
        if (isCompressed) {
          assertCompressionIsSupported();
          const hasEvenY = !Fp.isOdd(y);
          return (0, utils_ts_1.concatBytes)(pprefix(hasEvenY), bx);
        } else {
          return (0, utils_ts_1.concatBytes)(Uint8Array.of(4), bx, Fp.toBytes(y));
        }
      }
      function pointFromBytes(bytes) {
        (0, utils_ts_1._abytes2)(bytes, void 0, "Point");
        const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
        const length = bytes.length;
        const head = bytes[0];
        const tail = bytes.subarray(1);
        if (length === comp && (head === 2 || head === 3)) {
          const x = Fp.fromBytes(tail);
          if (!Fp.isValid(x))
            throw new Error("bad point: is not on curve, wrong x");
          const y2 = weierstrassEquation(x);
          let y;
          try {
            y = Fp.sqrt(y2);
          } catch (sqrtError) {
            const err = sqrtError instanceof Error ? ": " + sqrtError.message : "";
            throw new Error("bad point: is not on curve, sqrt error" + err);
          }
          assertCompressionIsSupported();
          const isYOdd = Fp.isOdd(y);
          const isHeadOdd = (head & 1) === 1;
          if (isHeadOdd !== isYOdd)
            y = Fp.neg(y);
          return { x, y };
        } else if (length === uncomp && head === 4) {
          const L = Fp.BYTES;
          const x = Fp.fromBytes(tail.subarray(0, L));
          const y = Fp.fromBytes(tail.subarray(L, L * 2));
          if (!isValidXY(x, y))
            throw new Error("bad point: is not on curve");
          return { x, y };
        } else {
          throw new Error(`bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`);
        }
      }
      const encodePoint = extraOpts.toBytes || pointToBytes;
      const decodePoint = extraOpts.fromBytes || pointFromBytes;
      function weierstrassEquation(x) {
        const x2 = Fp.sqr(x);
        const x3 = Fp.mul(x2, x);
        return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b);
      }
      function isValidXY(x, y) {
        const left = Fp.sqr(y);
        const right = weierstrassEquation(x);
        return Fp.eql(left, right);
      }
      if (!isValidXY(CURVE.Gx, CURVE.Gy))
        throw new Error("bad curve params: generator point");
      const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n), _4n);
      const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
      if (Fp.is0(Fp.add(_4a3, _27b2)))
        throw new Error("bad curve params: a or b");
      function acoord(title, n, banZero = false) {
        if (!Fp.isValid(n) || banZero && Fp.is0(n))
          throw new Error(`bad point coordinate ${title}`);
        return n;
      }
      function aprjpoint(other) {
        if (!(other instanceof Point))
          throw new Error("ProjectivePoint expected");
      }
      function splitEndoScalarN(k) {
        if (!endo || !endo.basises)
          throw new Error("no endo");
        return _splitEndoScalar(k, endo.basises, Fn.ORDER);
      }
      const toAffineMemo = (0, utils_ts_1.memoized)((p, iz) => {
        const { X, Y, Z } = p;
        if (Fp.eql(Z, Fp.ONE))
          return { x: X, y: Y };
        const is0 = p.is0();
        if (iz == null)
          iz = is0 ? Fp.ONE : Fp.inv(Z);
        const x = Fp.mul(X, iz);
        const y = Fp.mul(Y, iz);
        const zz = Fp.mul(Z, iz);
        if (is0)
          return { x: Fp.ZERO, y: Fp.ZERO };
        if (!Fp.eql(zz, Fp.ONE))
          throw new Error("invZ was invalid");
        return { x, y };
      });
      const assertValidMemo = (0, utils_ts_1.memoized)((p) => {
        if (p.is0()) {
          if (extraOpts.allowInfinityPoint && !Fp.is0(p.Y))
            return;
          throw new Error("bad point: ZERO");
        }
        const { x, y } = p.toAffine();
        if (!Fp.isValid(x) || !Fp.isValid(y))
          throw new Error("bad point: x or y not field elements");
        if (!isValidXY(x, y))
          throw new Error("bad point: equation left != right");
        if (!p.isTorsionFree())
          throw new Error("bad point: not in prime-order subgroup");
        return true;
      });
      function finishEndo(endoBeta, k1p, k2p, k1neg, k2neg) {
        k2p = new Point(Fp.mul(k2p.X, endoBeta), k2p.Y, k2p.Z);
        k1p = (0, curve_ts_1.negateCt)(k1neg, k1p);
        k2p = (0, curve_ts_1.negateCt)(k2neg, k2p);
        return k1p.add(k2p);
      }
      class Point {
        /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
        constructor(X, Y, Z) {
          this.X = acoord("x", X);
          this.Y = acoord("y", Y, true);
          this.Z = acoord("z", Z);
          Object.freeze(this);
        }
        static CURVE() {
          return CURVE;
        }
        /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
        static fromAffine(p) {
          const { x, y } = p || {};
          if (!p || !Fp.isValid(x) || !Fp.isValid(y))
            throw new Error("invalid affine point");
          if (p instanceof Point)
            throw new Error("projective point not allowed");
          if (Fp.is0(x) && Fp.is0(y))
            return Point.ZERO;
          return new Point(x, y, Fp.ONE);
        }
        static fromBytes(bytes) {
          const P = Point.fromAffine(decodePoint((0, utils_ts_1._abytes2)(bytes, void 0, "point")));
          P.assertValidity();
          return P;
        }
        static fromHex(hex) {
          return Point.fromBytes((0, utils_ts_1.ensureBytes)("pointHex", hex));
        }
        get x() {
          return this.toAffine().x;
        }
        get y() {
          return this.toAffine().y;
        }
        /**
         *
         * @param windowSize
         * @param isLazy true will defer table computation until the first multiplication
         * @returns
         */
        precompute(windowSize = 8, isLazy = true) {
          wnaf.createCache(this, windowSize);
          if (!isLazy)
            this.multiply(_3n);
          return this;
        }
        // TODO: return `this`
        /** A point on curve is valid if it conforms to equation. */
        assertValidity() {
          assertValidMemo(this);
        }
        hasEvenY() {
          const { y } = this.toAffine();
          if (!Fp.isOdd)
            throw new Error("Field doesn't support isOdd");
          return !Fp.isOdd(y);
        }
        /** Compare one point to another. */
        equals(other) {
          aprjpoint(other);
          const { X: X1, Y: Y1, Z: Z1 } = this;
          const { X: X2, Y: Y2, Z: Z2 } = other;
          const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
          const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
          return U1 && U2;
        }
        /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
        negate() {
          return new Point(this.X, Fp.neg(this.Y), this.Z);
        }
        // Renes-Costello-Batina exception-free doubling formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 3
        // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
        double() {
          const { a, b } = CURVE;
          const b3 = Fp.mul(b, _3n);
          const { X: X1, Y: Y1, Z: Z1 } = this;
          let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
          let t0 = Fp.mul(X1, X1);
          let t1 = Fp.mul(Y1, Y1);
          let t2 = Fp.mul(Z1, Z1);
          let t3 = Fp.mul(X1, Y1);
          t3 = Fp.add(t3, t3);
          Z3 = Fp.mul(X1, Z1);
          Z3 = Fp.add(Z3, Z3);
          X3 = Fp.mul(a, Z3);
          Y3 = Fp.mul(b3, t2);
          Y3 = Fp.add(X3, Y3);
          X3 = Fp.sub(t1, Y3);
          Y3 = Fp.add(t1, Y3);
          Y3 = Fp.mul(X3, Y3);
          X3 = Fp.mul(t3, X3);
          Z3 = Fp.mul(b3, Z3);
          t2 = Fp.mul(a, t2);
          t3 = Fp.sub(t0, t2);
          t3 = Fp.mul(a, t3);
          t3 = Fp.add(t3, Z3);
          Z3 = Fp.add(t0, t0);
          t0 = Fp.add(Z3, t0);
          t0 = Fp.add(t0, t2);
          t0 = Fp.mul(t0, t3);
          Y3 = Fp.add(Y3, t0);
          t2 = Fp.mul(Y1, Z1);
          t2 = Fp.add(t2, t2);
          t0 = Fp.mul(t2, t3);
          X3 = Fp.sub(X3, t0);
          Z3 = Fp.mul(t2, t1);
          Z3 = Fp.add(Z3, Z3);
          Z3 = Fp.add(Z3, Z3);
          return new Point(X3, Y3, Z3);
        }
        // Renes-Costello-Batina exception-free addition formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 1
        // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
        add(other) {
          aprjpoint(other);
          const { X: X1, Y: Y1, Z: Z1 } = this;
          const { X: X2, Y: Y2, Z: Z2 } = other;
          let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
          const a = CURVE.a;
          const b3 = Fp.mul(CURVE.b, _3n);
          let t0 = Fp.mul(X1, X2);
          let t1 = Fp.mul(Y1, Y2);
          let t2 = Fp.mul(Z1, Z2);
          let t3 = Fp.add(X1, Y1);
          let t4 = Fp.add(X2, Y2);
          t3 = Fp.mul(t3, t4);
          t4 = Fp.add(t0, t1);
          t3 = Fp.sub(t3, t4);
          t4 = Fp.add(X1, Z1);
          let t5 = Fp.add(X2, Z2);
          t4 = Fp.mul(t4, t5);
          t5 = Fp.add(t0, t2);
          t4 = Fp.sub(t4, t5);
          t5 = Fp.add(Y1, Z1);
          X3 = Fp.add(Y2, Z2);
          t5 = Fp.mul(t5, X3);
          X3 = Fp.add(t1, t2);
          t5 = Fp.sub(t5, X3);
          Z3 = Fp.mul(a, t4);
          X3 = Fp.mul(b3, t2);
          Z3 = Fp.add(X3, Z3);
          X3 = Fp.sub(t1, Z3);
          Z3 = Fp.add(t1, Z3);
          Y3 = Fp.mul(X3, Z3);
          t1 = Fp.add(t0, t0);
          t1 = Fp.add(t1, t0);
          t2 = Fp.mul(a, t2);
          t4 = Fp.mul(b3, t4);
          t1 = Fp.add(t1, t2);
          t2 = Fp.sub(t0, t2);
          t2 = Fp.mul(a, t2);
          t4 = Fp.add(t4, t2);
          t0 = Fp.mul(t1, t4);
          Y3 = Fp.add(Y3, t0);
          t0 = Fp.mul(t5, t4);
          X3 = Fp.mul(t3, X3);
          X3 = Fp.sub(X3, t0);
          t0 = Fp.mul(t3, t1);
          Z3 = Fp.mul(t5, Z3);
          Z3 = Fp.add(Z3, t0);
          return new Point(X3, Y3, Z3);
        }
        subtract(other) {
          return this.add(other.negate());
        }
        is0() {
          return this.equals(Point.ZERO);
        }
        /**
         * Constant time multiplication.
         * Uses wNAF method. Windowed method may be 10% faster,
         * but takes 2x longer to generate and consumes 2x memory.
         * Uses precomputes when available.
         * Uses endomorphism for Koblitz curves.
         * @param scalar by which the point would be multiplied
         * @returns New point
         */
        multiply(scalar) {
          const { endo: endo2 } = extraOpts;
          if (!Fn.isValidNot0(scalar))
            throw new Error("invalid scalar: out of range");
          let point, fake;
          const mul = (n) => wnaf.cached(this, n, (p) => (0, curve_ts_1.normalizeZ)(Point, p));
          if (endo2) {
            const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(scalar);
            const { p: k1p, f: k1f } = mul(k1);
            const { p: k2p, f: k2f } = mul(k2);
            fake = k1f.add(k2f);
            point = finishEndo(endo2.beta, k1p, k2p, k1neg, k2neg);
          } else {
            const { p, f } = mul(scalar);
            point = p;
            fake = f;
          }
          return (0, curve_ts_1.normalizeZ)(Point, [point, fake])[0];
        }
        /**
         * Non-constant-time multiplication. Uses double-and-add algorithm.
         * It's faster, but should only be used when you don't care about
         * an exposed secret key e.g. sig verification, which works over *public* keys.
         */
        multiplyUnsafe(sc) {
          const { endo: endo2 } = extraOpts;
          const p = this;
          if (!Fn.isValid(sc))
            throw new Error("invalid scalar: out of range");
          if (sc === _0n || p.is0())
            return Point.ZERO;
          if (sc === _1n)
            return p;
          if (wnaf.hasCache(this))
            return this.multiply(sc);
          if (endo2) {
            const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(sc);
            const { p1, p2 } = (0, curve_ts_1.mulEndoUnsafe)(Point, p, k1, k2);
            return finishEndo(endo2.beta, p1, p2, k1neg, k2neg);
          } else {
            return wnaf.unsafe(p, sc);
          }
        }
        multiplyAndAddUnsafe(Q, a, b) {
          const sum = this.multiplyUnsafe(a).add(Q.multiplyUnsafe(b));
          return sum.is0() ? void 0 : sum;
        }
        /**
         * Converts Projective point to affine (x, y) coordinates.
         * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
         */
        toAffine(invertedZ) {
          return toAffineMemo(this, invertedZ);
        }
        /**
         * Checks whether Point is free of torsion elements (is in prime subgroup).
         * Always torsion-free for cofactor=1 curves.
         */
        isTorsionFree() {
          const { isTorsionFree } = extraOpts;
          if (cofactor === _1n)
            return true;
          if (isTorsionFree)
            return isTorsionFree(Point, this);
          return wnaf.unsafe(this, CURVE_ORDER).is0();
        }
        clearCofactor() {
          const { clearCofactor } = extraOpts;
          if (cofactor === _1n)
            return this;
          if (clearCofactor)
            return clearCofactor(Point, this);
          return this.multiplyUnsafe(cofactor);
        }
        isSmallOrder() {
          return this.multiplyUnsafe(cofactor).is0();
        }
        toBytes(isCompressed = true) {
          (0, utils_ts_1._abool2)(isCompressed, "isCompressed");
          this.assertValidity();
          return encodePoint(Point, this, isCompressed);
        }
        toHex(isCompressed = true) {
          return (0, utils_ts_1.bytesToHex)(this.toBytes(isCompressed));
        }
        toString() {
          return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
        }
        // TODO: remove
        get px() {
          return this.X;
        }
        get py() {
          return this.X;
        }
        get pz() {
          return this.Z;
        }
        toRawBytes(isCompressed = true) {
          return this.toBytes(isCompressed);
        }
        _setWindowSize(windowSize) {
          this.precompute(windowSize);
        }
        static normalizeZ(points) {
          return (0, curve_ts_1.normalizeZ)(Point, points);
        }
        static msm(points, scalars) {
          return (0, curve_ts_1.pippenger)(Point, Fn, points, scalars);
        }
        static fromPrivateKey(privateKey) {
          return Point.BASE.multiply(_normFnElement(Fn, privateKey));
        }
      }
      Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
      Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
      Point.Fp = Fp;
      Point.Fn = Fn;
      const bits = Fn.BITS;
      const wnaf = new curve_ts_1.wNAF(Point, extraOpts.endo ? Math.ceil(bits / 2) : bits);
      Point.BASE.precompute(8);
      return Point;
    }
    function pprefix(hasEvenY) {
      return Uint8Array.of(hasEvenY ? 2 : 3);
    }
    function SWUFpSqrtRatio(Fp, Z) {
      const q = Fp.ORDER;
      let l = _0n;
      for (let o = q - _1n; o % _2n === _0n; o /= _2n)
        l += _1n;
      const c1 = l;
      const _2n_pow_c1_1 = _2n << c1 - _1n - _1n;
      const _2n_pow_c1 = _2n_pow_c1_1 * _2n;
      const c2 = (q - _1n) / _2n_pow_c1;
      const c3 = (c2 - _1n) / _2n;
      const c4 = _2n_pow_c1 - _1n;
      const c5 = _2n_pow_c1_1;
      const c6 = Fp.pow(Z, c2);
      const c7 = Fp.pow(Z, (c2 + _1n) / _2n);
      let sqrtRatio = (u, v) => {
        let tv1 = c6;
        let tv2 = Fp.pow(v, c4);
        let tv3 = Fp.sqr(tv2);
        tv3 = Fp.mul(tv3, v);
        let tv5 = Fp.mul(u, tv3);
        tv5 = Fp.pow(tv5, c3);
        tv5 = Fp.mul(tv5, tv2);
        tv2 = Fp.mul(tv5, v);
        tv3 = Fp.mul(tv5, u);
        let tv4 = Fp.mul(tv3, tv2);
        tv5 = Fp.pow(tv4, c5);
        let isQR = Fp.eql(tv5, Fp.ONE);
        tv2 = Fp.mul(tv3, c7);
        tv5 = Fp.mul(tv4, tv1);
        tv3 = Fp.cmov(tv2, tv3, isQR);
        tv4 = Fp.cmov(tv5, tv4, isQR);
        for (let i = c1; i > _1n; i--) {
          let tv52 = i - _2n;
          tv52 = _2n << tv52 - _1n;
          let tvv5 = Fp.pow(tv4, tv52);
          const e1 = Fp.eql(tvv5, Fp.ONE);
          tv2 = Fp.mul(tv3, tv1);
          tv1 = Fp.mul(tv1, tv1);
          tvv5 = Fp.mul(tv4, tv1);
          tv3 = Fp.cmov(tv2, tv3, e1);
          tv4 = Fp.cmov(tvv5, tv4, e1);
        }
        return { isValid: isQR, value: tv3 };
      };
      if (Fp.ORDER % _4n === _3n) {
        const c12 = (Fp.ORDER - _3n) / _4n;
        const c22 = Fp.sqrt(Fp.neg(Z));
        sqrtRatio = (u, v) => {
          let tv1 = Fp.sqr(v);
          const tv2 = Fp.mul(u, v);
          tv1 = Fp.mul(tv1, tv2);
          let y1 = Fp.pow(tv1, c12);
          y1 = Fp.mul(y1, tv2);
          const y2 = Fp.mul(y1, c22);
          const tv3 = Fp.mul(Fp.sqr(y1), v);
          const isQR = Fp.eql(tv3, u);
          let y = Fp.cmov(y2, y1, isQR);
          return { isValid: isQR, value: y };
        };
      }
      return sqrtRatio;
    }
    function mapToCurveSimpleSWU(Fp, opts) {
      (0, modular_ts_1.validateField)(Fp);
      const { A, B, Z } = opts;
      if (!Fp.isValid(A) || !Fp.isValid(B) || !Fp.isValid(Z))
        throw new Error("mapToCurveSimpleSWU: invalid opts");
      const sqrtRatio = SWUFpSqrtRatio(Fp, Z);
      if (!Fp.isOdd)
        throw new Error("Field does not have .isOdd()");
      return (u) => {
        let tv1, tv2, tv3, tv4, tv5, tv6, x, y;
        tv1 = Fp.sqr(u);
        tv1 = Fp.mul(tv1, Z);
        tv2 = Fp.sqr(tv1);
        tv2 = Fp.add(tv2, tv1);
        tv3 = Fp.add(tv2, Fp.ONE);
        tv3 = Fp.mul(tv3, B);
        tv4 = Fp.cmov(Z, Fp.neg(tv2), !Fp.eql(tv2, Fp.ZERO));
        tv4 = Fp.mul(tv4, A);
        tv2 = Fp.sqr(tv3);
        tv6 = Fp.sqr(tv4);
        tv5 = Fp.mul(tv6, A);
        tv2 = Fp.add(tv2, tv5);
        tv2 = Fp.mul(tv2, tv3);
        tv6 = Fp.mul(tv6, tv4);
        tv5 = Fp.mul(tv6, B);
        tv2 = Fp.add(tv2, tv5);
        x = Fp.mul(tv1, tv3);
        const { isValid, value } = sqrtRatio(tv2, tv6);
        y = Fp.mul(tv1, u);
        y = Fp.mul(y, value);
        x = Fp.cmov(x, tv3, isValid);
        y = Fp.cmov(y, value, isValid);
        const e1 = Fp.isOdd(u) === Fp.isOdd(y);
        y = Fp.cmov(Fp.neg(y), y, e1);
        const tv4_inv = (0, modular_ts_1.FpInvertBatch)(Fp, [tv4], true)[0];
        x = Fp.mul(x, tv4_inv);
        return { x, y };
      };
    }
    function getWLengths(Fp, Fn) {
      return {
        secretKey: Fn.BYTES,
        publicKey: 1 + Fp.BYTES,
        publicKeyUncompressed: 1 + 2 * Fp.BYTES,
        publicKeyHasPrefix: true,
        signature: 2 * Fn.BYTES
      };
    }
    function ecdh(Point, ecdhOpts = {}) {
      const { Fn } = Point;
      const randomBytes_ = ecdhOpts.randomBytes || utils_ts_1.randomBytes;
      const lengths = Object.assign(getWLengths(Point.Fp, Fn), { seed: (0, modular_ts_1.getMinHashLength)(Fn.ORDER) });
      function isValidSecretKey(secretKey) {
        try {
          return !!_normFnElement(Fn, secretKey);
        } catch (error) {
          return false;
        }
      }
      function isValidPublicKey(publicKey, isCompressed) {
        const { publicKey: comp, publicKeyUncompressed } = lengths;
        try {
          const l = publicKey.length;
          if (isCompressed === true && l !== comp)
            return false;
          if (isCompressed === false && l !== publicKeyUncompressed)
            return false;
          return !!Point.fromBytes(publicKey);
        } catch (error) {
          return false;
        }
      }
      function randomSecretKey(seed = randomBytes_(lengths.seed)) {
        return (0, modular_ts_1.mapHashToField)((0, utils_ts_1._abytes2)(seed, lengths.seed, "seed"), Fn.ORDER);
      }
      function getPublicKey(secretKey, isCompressed = true) {
        return Point.BASE.multiply(_normFnElement(Fn, secretKey)).toBytes(isCompressed);
      }
      function keygen(seed) {
        const secretKey = randomSecretKey(seed);
        return { secretKey, publicKey: getPublicKey(secretKey) };
      }
      function isProbPub(item) {
        if (typeof item === "bigint")
          return false;
        if (item instanceof Point)
          return true;
        const { secretKey, publicKey, publicKeyUncompressed } = lengths;
        if (Fn.allowedLengths || secretKey === publicKey)
          return void 0;
        const l = (0, utils_ts_1.ensureBytes)("key", item).length;
        return l === publicKey || l === publicKeyUncompressed;
      }
      function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
        if (isProbPub(secretKeyA) === true)
          throw new Error("first arg must be private key");
        if (isProbPub(publicKeyB) === false)
          throw new Error("second arg must be public key");
        const s = _normFnElement(Fn, secretKeyA);
        const b = Point.fromHex(publicKeyB);
        return b.multiply(s).toBytes(isCompressed);
      }
      const utils = {
        isValidSecretKey,
        isValidPublicKey,
        randomSecretKey,
        // TODO: remove
        isValidPrivateKey: isValidSecretKey,
        randomPrivateKey: randomSecretKey,
        normPrivateKeyToScalar: (key) => _normFnElement(Fn, key),
        precompute(windowSize = 8, point = Point.BASE) {
          return point.precompute(windowSize, false);
        }
      };
      return Object.freeze({ getPublicKey, getSharedSecret, keygen, Point, utils, lengths });
    }
    function ecdsa(Point, hash, ecdsaOpts = {}) {
      (0, utils_1.ahash)(hash);
      (0, utils_ts_1._validateObject)(ecdsaOpts, {}, {
        hmac: "function",
        lowS: "boolean",
        randomBytes: "function",
        bits2int: "function",
        bits2int_modN: "function"
      });
      const randomBytes = ecdsaOpts.randomBytes || utils_ts_1.randomBytes;
      const hmac = ecdsaOpts.hmac || ((key, ...msgs) => (0, hmac_js_1.hmac)(hash, key, (0, utils_ts_1.concatBytes)(...msgs)));
      const { Fp, Fn } = Point;
      const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
      const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, ecdsaOpts);
      const defaultSigOpts = {
        prehash: false,
        lowS: typeof ecdsaOpts.lowS === "boolean" ? ecdsaOpts.lowS : false,
        format: void 0,
        //'compact' as ECDSASigFormat,
        extraEntropy: false
      };
      const defaultSigOpts_format = "compact";
      function isBiggerThanHalfOrder(number) {
        const HALF = CURVE_ORDER >> _1n;
        return number > HALF;
      }
      function validateRS(title, num) {
        if (!Fn.isValidNot0(num))
          throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
        return num;
      }
      function validateSigLength(bytes, format) {
        validateSigFormat(format);
        const size = lengths.signature;
        const sizer = format === "compact" ? size : format === "recovered" ? size + 1 : void 0;
        return (0, utils_ts_1._abytes2)(bytes, sizer, `${format} signature`);
      }
      class Signature {
        constructor(r, s, recovery) {
          this.r = validateRS("r", r);
          this.s = validateRS("s", s);
          if (recovery != null)
            this.recovery = recovery;
          Object.freeze(this);
        }
        static fromBytes(bytes, format = defaultSigOpts_format) {
          validateSigLength(bytes, format);
          let recid;
          if (format === "der") {
            const { r: r2, s: s2 } = exports.DER.toSig((0, utils_ts_1._abytes2)(bytes));
            return new Signature(r2, s2);
          }
          if (format === "recovered") {
            recid = bytes[0];
            format = "compact";
            bytes = bytes.subarray(1);
          }
          const L = Fn.BYTES;
          const r = bytes.subarray(0, L);
          const s = bytes.subarray(L, L * 2);
          return new Signature(Fn.fromBytes(r), Fn.fromBytes(s), recid);
        }
        static fromHex(hex, format) {
          return this.fromBytes((0, utils_ts_1.hexToBytes)(hex), format);
        }
        addRecoveryBit(recovery) {
          return new Signature(this.r, this.s, recovery);
        }
        recoverPublicKey(messageHash) {
          const FIELD_ORDER = Fp.ORDER;
          const { r, s, recovery: rec } = this;
          if (rec == null || ![0, 1, 2, 3].includes(rec))
            throw new Error("recovery id invalid");
          const hasCofactor = CURVE_ORDER * _2n < FIELD_ORDER;
          if (hasCofactor && rec > 1)
            throw new Error("recovery id is ambiguous for h>1 curve");
          const radj = rec === 2 || rec === 3 ? r + CURVE_ORDER : r;
          if (!Fp.isValid(radj))
            throw new Error("recovery id 2 or 3 invalid");
          const x = Fp.toBytes(radj);
          const R = Point.fromBytes((0, utils_ts_1.concatBytes)(pprefix((rec & 1) === 0), x));
          const ir = Fn.inv(radj);
          const h = bits2int_modN((0, utils_ts_1.ensureBytes)("msgHash", messageHash));
          const u1 = Fn.create(-h * ir);
          const u2 = Fn.create(s * ir);
          const Q = Point.BASE.multiplyUnsafe(u1).add(R.multiplyUnsafe(u2));
          if (Q.is0())
            throw new Error("point at infinify");
          Q.assertValidity();
          return Q;
        }
        // Signatures should be low-s, to prevent malleability.
        hasHighS() {
          return isBiggerThanHalfOrder(this.s);
        }
        toBytes(format = defaultSigOpts_format) {
          validateSigFormat(format);
          if (format === "der")
            return (0, utils_ts_1.hexToBytes)(exports.DER.hexFromSig(this));
          const r = Fn.toBytes(this.r);
          const s = Fn.toBytes(this.s);
          if (format === "recovered") {
            if (this.recovery == null)
              throw new Error("recovery bit must be present");
            return (0, utils_ts_1.concatBytes)(Uint8Array.of(this.recovery), r, s);
          }
          return (0, utils_ts_1.concatBytes)(r, s);
        }
        toHex(format) {
          return (0, utils_ts_1.bytesToHex)(this.toBytes(format));
        }
        // TODO: remove
        assertValidity() {
        }
        static fromCompact(hex) {
          return Signature.fromBytes((0, utils_ts_1.ensureBytes)("sig", hex), "compact");
        }
        static fromDER(hex) {
          return Signature.fromBytes((0, utils_ts_1.ensureBytes)("sig", hex), "der");
        }
        normalizeS() {
          return this.hasHighS() ? new Signature(this.r, Fn.neg(this.s), this.recovery) : this;
        }
        toDERRawBytes() {
          return this.toBytes("der");
        }
        toDERHex() {
          return (0, utils_ts_1.bytesToHex)(this.toBytes("der"));
        }
        toCompactRawBytes() {
          return this.toBytes("compact");
        }
        toCompactHex() {
          return (0, utils_ts_1.bytesToHex)(this.toBytes("compact"));
        }
      }
      const bits2int = ecdsaOpts.bits2int || function bits2int_def(bytes) {
        if (bytes.length > 8192)
          throw new Error("input is too large");
        const num = (0, utils_ts_1.bytesToNumberBE)(bytes);
        const delta = bytes.length * 8 - fnBits;
        return delta > 0 ? num >> BigInt(delta) : num;
      };
      const bits2int_modN = ecdsaOpts.bits2int_modN || function bits2int_modN_def(bytes) {
        return Fn.create(bits2int(bytes));
      };
      const ORDER_MASK = (0, utils_ts_1.bitMask)(fnBits);
      function int2octets(num) {
        (0, utils_ts_1.aInRange)("num < 2^" + fnBits, num, _0n, ORDER_MASK);
        return Fn.toBytes(num);
      }
      function validateMsgAndHash(message, prehash) {
        (0, utils_ts_1._abytes2)(message, void 0, "message");
        return prehash ? (0, utils_ts_1._abytes2)(hash(message), void 0, "prehashed message") : message;
      }
      function prepSig(message, privateKey, opts) {
        if (["recovered", "canonical"].some((k) => k in opts))
          throw new Error("sign() legacy options not supported");
        const { lowS, prehash, extraEntropy } = validateSigOpts(opts, defaultSigOpts);
        message = validateMsgAndHash(message, prehash);
        const h1int = bits2int_modN(message);
        const d = _normFnElement(Fn, privateKey);
        const seedArgs = [int2octets(d), int2octets(h1int)];
        if (extraEntropy != null && extraEntropy !== false) {
          const e = extraEntropy === true ? randomBytes(lengths.secretKey) : extraEntropy;
          seedArgs.push((0, utils_ts_1.ensureBytes)("extraEntropy", e));
        }
        const seed = (0, utils_ts_1.concatBytes)(...seedArgs);
        const m = h1int;
        function k2sig(kBytes) {
          const k = bits2int(kBytes);
          if (!Fn.isValidNot0(k))
            return;
          const ik = Fn.inv(k);
          const q = Point.BASE.multiply(k).toAffine();
          const r = Fn.create(q.x);
          if (r === _0n)
            return;
          const s = Fn.create(ik * Fn.create(m + r * d));
          if (s === _0n)
            return;
          let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n);
          let normS = s;
          if (lowS && isBiggerThanHalfOrder(s)) {
            normS = Fn.neg(s);
            recovery ^= 1;
          }
          return new Signature(r, normS, recovery);
        }
        return { seed, k2sig };
      }
      function sign(message, secretKey, opts = {}) {
        message = (0, utils_ts_1.ensureBytes)("message", message);
        const { seed, k2sig } = prepSig(message, secretKey, opts);
        const drbg = (0, utils_ts_1.createHmacDrbg)(hash.outputLen, Fn.BYTES, hmac);
        const sig = drbg(seed, k2sig);
        return sig;
      }
      function tryParsingSig(sg) {
        let sig = void 0;
        const isHex = typeof sg === "string" || (0, utils_ts_1.isBytes)(sg);
        const isObj = !isHex && sg !== null && typeof sg === "object" && typeof sg.r === "bigint" && typeof sg.s === "bigint";
        if (!isHex && !isObj)
          throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
        if (isObj) {
          sig = new Signature(sg.r, sg.s);
        } else if (isHex) {
          try {
            sig = Signature.fromBytes((0, utils_ts_1.ensureBytes)("sig", sg), "der");
          } catch (derError) {
            if (!(derError instanceof exports.DER.Err))
              throw derError;
          }
          if (!sig) {
            try {
              sig = Signature.fromBytes((0, utils_ts_1.ensureBytes)("sig", sg), "compact");
            } catch (error) {
              return false;
            }
          }
        }
        if (!sig)
          return false;
        return sig;
      }
      function verify(signature, message, publicKey, opts = {}) {
        const { lowS, prehash, format } = validateSigOpts(opts, defaultSigOpts);
        publicKey = (0, utils_ts_1.ensureBytes)("publicKey", publicKey);
        message = validateMsgAndHash((0, utils_ts_1.ensureBytes)("message", message), prehash);
        if ("strict" in opts)
          throw new Error("options.strict was renamed to lowS");
        const sig = format === void 0 ? tryParsingSig(signature) : Signature.fromBytes((0, utils_ts_1.ensureBytes)("sig", signature), format);
        if (sig === false)
          return false;
        try {
          const P = Point.fromBytes(publicKey);
          if (lowS && sig.hasHighS())
            return false;
          const { r, s } = sig;
          const h = bits2int_modN(message);
          const is = Fn.inv(s);
          const u1 = Fn.create(h * is);
          const u2 = Fn.create(r * is);
          const R = Point.BASE.multiplyUnsafe(u1).add(P.multiplyUnsafe(u2));
          if (R.is0())
            return false;
          const v = Fn.create(R.x);
          return v === r;
        } catch (e) {
          return false;
        }
      }
      function recoverPublicKey(signature, message, opts = {}) {
        const { prehash } = validateSigOpts(opts, defaultSigOpts);
        message = validateMsgAndHash(message, prehash);
        return Signature.fromBytes(signature, "recovered").recoverPublicKey(message).toBytes();
      }
      return Object.freeze({
        keygen,
        getPublicKey,
        getSharedSecret,
        utils,
        lengths,
        Point,
        sign,
        verify,
        recoverPublicKey,
        Signature,
        hash
      });
    }
    function weierstrassPoints(c) {
      const { CURVE, curveOpts } = _weierstrass_legacy_opts_to_new(c);
      const Point = weierstrassN(CURVE, curveOpts);
      return _weierstrass_new_output_to_legacy(c, Point);
    }
    function _weierstrass_legacy_opts_to_new(c) {
      const CURVE = {
        a: c.a,
        b: c.b,
        p: c.Fp.ORDER,
        n: c.n,
        h: c.h,
        Gx: c.Gx,
        Gy: c.Gy
      };
      const Fp = c.Fp;
      let allowedLengths = c.allowedPrivateKeyLengths ? Array.from(new Set(c.allowedPrivateKeyLengths.map((l) => Math.ceil(l / 2)))) : void 0;
      const Fn = (0, modular_ts_1.Field)(CURVE.n, {
        BITS: c.nBitLength,
        allowedLengths,
        modFromBytes: c.wrapPrivateKey
      });
      const curveOpts = {
        Fp,
        Fn,
        allowInfinityPoint: c.allowInfinityPoint,
        endo: c.endo,
        isTorsionFree: c.isTorsionFree,
        clearCofactor: c.clearCofactor,
        fromBytes: c.fromBytes,
        toBytes: c.toBytes
      };
      return { CURVE, curveOpts };
    }
    function _ecdsa_legacy_opts_to_new(c) {
      const { CURVE, curveOpts } = _weierstrass_legacy_opts_to_new(c);
      const ecdsaOpts = {
        hmac: c.hmac,
        randomBytes: c.randomBytes,
        lowS: c.lowS,
        bits2int: c.bits2int,
        bits2int_modN: c.bits2int_modN
      };
      return { CURVE, curveOpts, hash: c.hash, ecdsaOpts };
    }
    function _legacyHelperEquat(Fp, a, b) {
      function weierstrassEquation(x) {
        const x2 = Fp.sqr(x);
        const x3 = Fp.mul(x2, x);
        return Fp.add(Fp.add(x3, Fp.mul(x, a)), b);
      }
      return weierstrassEquation;
    }
    function _weierstrass_new_output_to_legacy(c, Point) {
      const { Fp, Fn } = Point;
      function isWithinCurveOrder(num) {
        return (0, utils_ts_1.inRange)(num, _1n, Fn.ORDER);
      }
      const weierstrassEquation = _legacyHelperEquat(Fp, c.a, c.b);
      return Object.assign({}, {
        CURVE: c,
        Point,
        ProjectivePoint: Point,
        normPrivateKeyToScalar: (key) => _normFnElement(Fn, key),
        weierstrassEquation,
        isWithinCurveOrder
      });
    }
    function _ecdsa_new_output_to_legacy(c, _ecdsa) {
      const Point = _ecdsa.Point;
      return Object.assign({}, _ecdsa, {
        ProjectivePoint: Point,
        CURVE: Object.assign({}, c, (0, modular_ts_1.nLength)(Point.Fn.ORDER, Point.Fn.BITS))
      });
    }
    function weierstrass(c) {
      const { CURVE, curveOpts, hash, ecdsaOpts } = _ecdsa_legacy_opts_to_new(c);
      const Point = weierstrassN(CURVE, curveOpts);
      const signs = ecdsa(Point, hash, ecdsaOpts);
      return _ecdsa_new_output_to_legacy(c, signs);
    }
  }
});

// node_modules/@noble/curves/_shortw_utils.js
var require_shortw_utils = __commonJS({
  "node_modules/@noble/curves/_shortw_utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getHash = getHash;
    exports.createCurve = createCurve;
    var weierstrass_ts_1 = require_weierstrass();
    function getHash(hash) {
      return { hash };
    }
    function createCurve(curveDef, defHash) {
      const create = (hash) => (0, weierstrass_ts_1.weierstrass)({ ...curveDef, hash });
      return { ...create(defHash), create };
    }
  }
});

// node_modules/@noble/curves/abstract/hash-to-curve.js
var require_hash_to_curve = __commonJS({
  "node_modules/@noble/curves/abstract/hash-to-curve.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports._DST_scalar = void 0;
    exports.expand_message_xmd = expand_message_xmd;
    exports.expand_message_xof = expand_message_xof;
    exports.hash_to_field = hash_to_field;
    exports.isogenyMap = isogenyMap;
    exports.createHasher = createHasher;
    var utils_ts_1 = require_utils2();
    var modular_ts_1 = require_modular();
    var os2ip = utils_ts_1.bytesToNumberBE;
    function i2osp(value, length) {
      anum(value);
      anum(length);
      if (value < 0 || value >= 1 << 8 * length)
        throw new Error("invalid I2OSP input: " + value);
      const res = Array.from({ length }).fill(0);
      for (let i = length - 1; i >= 0; i--) {
        res[i] = value & 255;
        value >>>= 8;
      }
      return new Uint8Array(res);
    }
    function strxor(a, b) {
      const arr = new Uint8Array(a.length);
      for (let i = 0; i < a.length; i++) {
        arr[i] = a[i] ^ b[i];
      }
      return arr;
    }
    function anum(item) {
      if (!Number.isSafeInteger(item))
        throw new Error("number expected");
    }
    function normDST(DST) {
      if (!(0, utils_ts_1.isBytes)(DST) && typeof DST !== "string")
        throw new Error("DST must be Uint8Array or string");
      return typeof DST === "string" ? (0, utils_ts_1.utf8ToBytes)(DST) : DST;
    }
    function expand_message_xmd(msg, DST, lenInBytes, H) {
      (0, utils_ts_1.abytes)(msg);
      anum(lenInBytes);
      DST = normDST(DST);
      if (DST.length > 255)
        DST = H((0, utils_ts_1.concatBytes)((0, utils_ts_1.utf8ToBytes)("H2C-OVERSIZE-DST-"), DST));
      const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
      const ell = Math.ceil(lenInBytes / b_in_bytes);
      if (lenInBytes > 65535 || ell > 255)
        throw new Error("expand_message_xmd: invalid lenInBytes");
      const DST_prime = (0, utils_ts_1.concatBytes)(DST, i2osp(DST.length, 1));
      const Z_pad = i2osp(0, r_in_bytes);
      const l_i_b_str = i2osp(lenInBytes, 2);
      const b = new Array(ell);
      const b_0 = H((0, utils_ts_1.concatBytes)(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
      b[0] = H((0, utils_ts_1.concatBytes)(b_0, i2osp(1, 1), DST_prime));
      for (let i = 1; i <= ell; i++) {
        const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
        b[i] = H((0, utils_ts_1.concatBytes)(...args));
      }
      const pseudo_random_bytes = (0, utils_ts_1.concatBytes)(...b);
      return pseudo_random_bytes.slice(0, lenInBytes);
    }
    function expand_message_xof(msg, DST, lenInBytes, k, H) {
      (0, utils_ts_1.abytes)(msg);
      anum(lenInBytes);
      DST = normDST(DST);
      if (DST.length > 255) {
        const dkLen = Math.ceil(2 * k / 8);
        DST = H.create({ dkLen }).update((0, utils_ts_1.utf8ToBytes)("H2C-OVERSIZE-DST-")).update(DST).digest();
      }
      if (lenInBytes > 65535 || DST.length > 255)
        throw new Error("expand_message_xof: invalid lenInBytes");
      return H.create({ dkLen: lenInBytes }).update(msg).update(i2osp(lenInBytes, 2)).update(DST).update(i2osp(DST.length, 1)).digest();
    }
    function hash_to_field(msg, count, options) {
      (0, utils_ts_1._validateObject)(options, {
        p: "bigint",
        m: "number",
        k: "number",
        hash: "function"
      });
      const { p, k, m, hash, expand, DST } = options;
      if (!(0, utils_ts_1.isHash)(options.hash))
        throw new Error("expected valid hash");
      (0, utils_ts_1.abytes)(msg);
      anum(count);
      const log2p = p.toString(2).length;
      const L = Math.ceil((log2p + k) / 8);
      const len_in_bytes = count * m * L;
      let prb;
      if (expand === "xmd") {
        prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
      } else if (expand === "xof") {
        prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
      } else if (expand === "_internal_pass") {
        prb = msg;
      } else {
        throw new Error('expand must be "xmd" or "xof"');
      }
      const u = new Array(count);
      for (let i = 0; i < count; i++) {
        const e = new Array(m);
        for (let j = 0; j < m; j++) {
          const elm_offset = L * (j + i * m);
          const tv = prb.subarray(elm_offset, elm_offset + L);
          e[j] = (0, modular_ts_1.mod)(os2ip(tv), p);
        }
        u[i] = e;
      }
      return u;
    }
    function isogenyMap(field, map) {
      const coeff = map.map((i) => Array.from(i).reverse());
      return (x, y) => {
        const [xn, xd, yn, yd] = coeff.map((val) => val.reduce((acc, i) => field.add(field.mul(acc, x), i)));
        const [xd_inv, yd_inv] = (0, modular_ts_1.FpInvertBatch)(field, [xd, yd], true);
        x = field.mul(xn, xd_inv);
        y = field.mul(y, field.mul(yn, yd_inv));
        return { x, y };
      };
    }
    exports._DST_scalar = (0, utils_ts_1.utf8ToBytes)("HashToScalar-");
    function createHasher(Point, mapToCurve, defaults) {
      if (typeof mapToCurve !== "function")
        throw new Error("mapToCurve() must be defined");
      function map(num) {
        return Point.fromAffine(mapToCurve(num));
      }
      function clear(initial) {
        const P = initial.clearCofactor();
        if (P.equals(Point.ZERO))
          return Point.ZERO;
        P.assertValidity();
        return P;
      }
      return {
        defaults,
        hashToCurve(msg, options) {
          const opts = Object.assign({}, defaults, options);
          const u = hash_to_field(msg, 2, opts);
          const u0 = map(u[0]);
          const u1 = map(u[1]);
          return clear(u0.add(u1));
        },
        encodeToCurve(msg, options) {
          const optsDst = defaults.encodeDST ? { DST: defaults.encodeDST } : {};
          const opts = Object.assign({}, defaults, optsDst, options);
          const u = hash_to_field(msg, 1, opts);
          const u0 = map(u[0]);
          return clear(u0);
        },
        /** See {@link H2CHasher} */
        mapToCurve(scalars) {
          if (!Array.isArray(scalars))
            throw new Error("expected array of bigints");
          for (const i of scalars)
            if (typeof i !== "bigint")
              throw new Error("expected array of bigints");
          return clear(map(scalars));
        },
        // hash_to_scalar can produce 0: https://www.rfc-editor.org/errata/eid8393
        // RFC 9380, draft-irtf-cfrg-bbs-signatures-08
        hashToScalar(msg, options) {
          const N = Point.Fn.ORDER;
          const opts = Object.assign({}, defaults, { p: N, m: 1, DST: exports._DST_scalar }, options);
          return hash_to_field(msg, 1, opts)[0][0];
        }
      };
    }
  }
});

// node_modules/@noble/curves/secp256k1.js
var require_secp256k1 = __commonJS({
  "node_modules/@noble/curves/secp256k1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.encodeToCurve = exports.hashToCurve = exports.secp256k1_hasher = exports.schnorr = exports.secp256k1 = void 0;
    var sha2_js_1 = require_sha2();
    var utils_js_1 = require_utils();
    var _shortw_utils_ts_1 = require_shortw_utils();
    var hash_to_curve_ts_1 = require_hash_to_curve();
    var modular_ts_1 = require_modular();
    var weierstrass_ts_1 = require_weierstrass();
    var utils_ts_1 = require_utils2();
    var secp256k1_CURVE = {
      p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
      n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
      h: BigInt(1),
      a: BigInt(0),
      b: BigInt(7),
      Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
      Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
    };
    var secp256k1_ENDO = {
      beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
      basises: [
        [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
        [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
      ]
    };
    var _0n = BigInt(0);
    var _1n = BigInt(1);
    var _2n = BigInt(2);
    function sqrtMod(y) {
      const P = secp256k1_CURVE.p;
      const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
      const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
      const b2 = y * y * y % P;
      const b3 = b2 * b2 * y % P;
      const b6 = (0, modular_ts_1.pow2)(b3, _3n, P) * b3 % P;
      const b9 = (0, modular_ts_1.pow2)(b6, _3n, P) * b3 % P;
      const b11 = (0, modular_ts_1.pow2)(b9, _2n, P) * b2 % P;
      const b22 = (0, modular_ts_1.pow2)(b11, _11n, P) * b11 % P;
      const b44 = (0, modular_ts_1.pow2)(b22, _22n, P) * b22 % P;
      const b88 = (0, modular_ts_1.pow2)(b44, _44n, P) * b44 % P;
      const b176 = (0, modular_ts_1.pow2)(b88, _88n, P) * b88 % P;
      const b220 = (0, modular_ts_1.pow2)(b176, _44n, P) * b44 % P;
      const b223 = (0, modular_ts_1.pow2)(b220, _3n, P) * b3 % P;
      const t1 = (0, modular_ts_1.pow2)(b223, _23n, P) * b22 % P;
      const t2 = (0, modular_ts_1.pow2)(t1, _6n, P) * b2 % P;
      const root = (0, modular_ts_1.pow2)(t2, _2n, P);
      if (!Fpk1.eql(Fpk1.sqr(root), y))
        throw new Error("Cannot find square root");
      return root;
    }
    var Fpk1 = (0, modular_ts_1.Field)(secp256k1_CURVE.p, { sqrt: sqrtMod });
    exports.secp256k1 = (0, _shortw_utils_ts_1.createCurve)({ ...secp256k1_CURVE, Fp: Fpk1, lowS: true, endo: secp256k1_ENDO }, sha2_js_1.sha256);
    var TAGGED_HASH_PREFIXES = {};
    function taggedHash(tag, ...messages) {
      let tagP = TAGGED_HASH_PREFIXES[tag];
      if (tagP === void 0) {
        const tagH = (0, sha2_js_1.sha256)((0, utils_ts_1.utf8ToBytes)(tag));
        tagP = (0, utils_ts_1.concatBytes)(tagH, tagH);
        TAGGED_HASH_PREFIXES[tag] = tagP;
      }
      return (0, sha2_js_1.sha256)((0, utils_ts_1.concatBytes)(tagP, ...messages));
    }
    var pointToBytes = (point) => point.toBytes(true).slice(1);
    var Pointk1 = (() => exports.secp256k1.Point)();
    var hasEven = (y) => y % _2n === _0n;
    function schnorrGetExtPubKey(priv) {
      const { Fn, BASE } = Pointk1;
      const d_ = (0, weierstrass_ts_1._normFnElement)(Fn, priv);
      const p = BASE.multiply(d_);
      const scalar = hasEven(p.y) ? d_ : Fn.neg(d_);
      return { scalar, bytes: pointToBytes(p) };
    }
    function lift_x(x) {
      const Fp = Fpk1;
      if (!Fp.isValidNot0(x))
        throw new Error("invalid x: Fail if x ≥ p");
      const xx = Fp.create(x * x);
      const c = Fp.create(xx * x + BigInt(7));
      let y = Fp.sqrt(c);
      if (!hasEven(y))
        y = Fp.neg(y);
      const p = Pointk1.fromAffine({ x, y });
      p.assertValidity();
      return p;
    }
    var num = utils_ts_1.bytesToNumberBE;
    function challenge(...args) {
      return Pointk1.Fn.create(num(taggedHash("BIP0340/challenge", ...args)));
    }
    function schnorrGetPublicKey(secretKey) {
      return schnorrGetExtPubKey(secretKey).bytes;
    }
    function schnorrSign(message, secretKey, auxRand = (0, utils_js_1.randomBytes)(32)) {
      const { Fn } = Pointk1;
      const m = (0, utils_ts_1.ensureBytes)("message", message);
      const { bytes: px, scalar: d } = schnorrGetExtPubKey(secretKey);
      const a = (0, utils_ts_1.ensureBytes)("auxRand", auxRand, 32);
      const t = Fn.toBytes(d ^ num(taggedHash("BIP0340/aux", a)));
      const rand = taggedHash("BIP0340/nonce", t, px, m);
      const { bytes: rx, scalar: k } = schnorrGetExtPubKey(rand);
      const e = challenge(rx, px, m);
      const sig = new Uint8Array(64);
      sig.set(rx, 0);
      sig.set(Fn.toBytes(Fn.create(k + e * d)), 32);
      if (!schnorrVerify(sig, m, px))
        throw new Error("sign: Invalid signature produced");
      return sig;
    }
    function schnorrVerify(signature, message, publicKey) {
      const { Fn, BASE } = Pointk1;
      const sig = (0, utils_ts_1.ensureBytes)("signature", signature, 64);
      const m = (0, utils_ts_1.ensureBytes)("message", message);
      const pub = (0, utils_ts_1.ensureBytes)("publicKey", publicKey, 32);
      try {
        const P = lift_x(num(pub));
        const r = num(sig.subarray(0, 32));
        if (!(0, utils_ts_1.inRange)(r, _1n, secp256k1_CURVE.p))
          return false;
        const s = num(sig.subarray(32, 64));
        if (!(0, utils_ts_1.inRange)(s, _1n, secp256k1_CURVE.n))
          return false;
        const e = challenge(Fn.toBytes(r), pointToBytes(P), m);
        const R = BASE.multiplyUnsafe(s).add(P.multiplyUnsafe(Fn.neg(e)));
        const { x, y } = R.toAffine();
        if (R.is0() || !hasEven(y) || x !== r)
          return false;
        return true;
      } catch (error) {
        return false;
      }
    }
    exports.schnorr = (() => {
      const size = 32;
      const seedLength = 48;
      const randomSecretKey = (seed = (0, utils_js_1.randomBytes)(seedLength)) => {
        return (0, modular_ts_1.mapHashToField)(seed, secp256k1_CURVE.n);
      };
      exports.secp256k1.utils.randomSecretKey;
      function keygen(seed) {
        const secretKey = randomSecretKey(seed);
        return { secretKey, publicKey: schnorrGetPublicKey(secretKey) };
      }
      return {
        keygen,
        getPublicKey: schnorrGetPublicKey,
        sign: schnorrSign,
        verify: schnorrVerify,
        Point: Pointk1,
        utils: {
          randomSecretKey,
          randomPrivateKey: randomSecretKey,
          taggedHash,
          // TODO: remove
          lift_x,
          pointToBytes,
          numberToBytesBE: utils_ts_1.numberToBytesBE,
          bytesToNumberBE: utils_ts_1.bytesToNumberBE,
          mod: modular_ts_1.mod
        },
        lengths: {
          secretKey: size,
          publicKey: size,
          publicKeyHasPrefix: false,
          signature: size * 2,
          seed: seedLength
        }
      };
    })();
    var isoMap = (() => (0, hash_to_curve_ts_1.isogenyMap)(Fpk1, [
      // xNum
      [
        "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7",
        "0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581",
        "0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262",
        "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c"
      ],
      // xDen
      [
        "0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b",
        "0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14",
        "0x0000000000000000000000000000000000000000000000000000000000000001"
        // LAST 1
      ],
      // yNum
      [
        "0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c",
        "0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3",
        "0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931",
        "0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84"
      ],
      // yDen
      [
        "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b",
        "0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573",
        "0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f",
        "0x0000000000000000000000000000000000000000000000000000000000000001"
        // LAST 1
      ]
    ].map((i) => i.map((j) => BigInt(j)))))();
    var mapSWU = (() => (0, weierstrass_ts_1.mapToCurveSimpleSWU)(Fpk1, {
      A: BigInt("0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533"),
      B: BigInt("1771"),
      Z: Fpk1.create(BigInt("-11"))
    }))();
    exports.secp256k1_hasher = (() => (0, hash_to_curve_ts_1.createHasher)(exports.secp256k1.Point, (scalars) => {
      const { x, y } = mapSWU(Fpk1.create(scalars[0]));
      return isoMap(x, y);
    }, {
      DST: "secp256k1_XMD:SHA-256_SSWU_RO_",
      encodeDST: "secp256k1_XMD:SHA-256_SSWU_NU_",
      p: Fpk1.ORDER,
      m: 1,
      k: 128,
      expand: "xmd",
      hash: sha2_js_1.sha256
    }))();
    exports.hashToCurve = (() => exports.secp256k1_hasher.hashToCurve)();
    exports.encodeToCurve = (() => exports.secp256k1_hasher.encodeToCurve)();
  }
});

// node_modules/@noble/curves/abstract/utils.js
var require_utils3 = __commonJS({
  "node_modules/@noble/curves/abstract/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isHash = exports.validateObject = exports.memoized = exports.notImplemented = exports.createHmacDrbg = exports.bitMask = exports.bitSet = exports.bitGet = exports.bitLen = exports.aInRange = exports.inRange = exports.asciiToBytes = exports.copyBytes = exports.equalBytes = exports.ensureBytes = exports.numberToVarBytesBE = exports.numberToBytesLE = exports.numberToBytesBE = exports.bytesToNumberLE = exports.bytesToNumberBE = exports.hexToNumber = exports.numberToHexUnpadded = exports.abool = exports.utf8ToBytes = exports.randomBytes = exports.isBytes = exports.hexToBytes = exports.concatBytes = exports.bytesToUtf8 = exports.bytesToHex = exports.anumber = exports.abytes = void 0;
    var u = require_utils2();
    exports.abytes = u.abytes;
    exports.anumber = u.anumber;
    exports.bytesToHex = u.bytesToHex;
    exports.bytesToUtf8 = u.bytesToUtf8;
    exports.concatBytes = u.concatBytes;
    exports.hexToBytes = u.hexToBytes;
    exports.isBytes = u.isBytes;
    exports.randomBytes = u.randomBytes;
    exports.utf8ToBytes = u.utf8ToBytes;
    exports.abool = u.abool;
    exports.numberToHexUnpadded = u.numberToHexUnpadded;
    exports.hexToNumber = u.hexToNumber;
    exports.bytesToNumberBE = u.bytesToNumberBE;
    exports.bytesToNumberLE = u.bytesToNumberLE;
    exports.numberToBytesBE = u.numberToBytesBE;
    exports.numberToBytesLE = u.numberToBytesLE;
    exports.numberToVarBytesBE = u.numberToVarBytesBE;
    exports.ensureBytes = u.ensureBytes;
    exports.equalBytes = u.equalBytes;
    exports.copyBytes = u.copyBytes;
    exports.asciiToBytes = u.asciiToBytes;
    exports.inRange = u.inRange;
    exports.aInRange = u.aInRange;
    exports.bitLen = u.bitLen;
    exports.bitGet = u.bitGet;
    exports.bitSet = u.bitSet;
    exports.bitMask = u.bitMask;
    exports.createHmacDrbg = u.createHmacDrbg;
    exports.notImplemented = u.notImplemented;
    exports.memoized = u.memoized;
    exports.validateObject = u.validateObject;
    exports.isHash = u.isHash;
  }
});

// node_modules/@bitcoinerlab/secp256k1/dist/index.js
var require_dist = __commonJS({
  "node_modules/@bitcoinerlab/secp256k1/dist/index.js"(exports) {
    var secp256k1 = require_secp256k1();
    var mod = require_modular();
    var utils = require_utils3();
    function _interopNamespaceDefault(e) {
      var n = /* @__PURE__ */ Object.create(null);
      if (e) {
        Object.keys(e).forEach(function(k) {
          if (k !== "default") {
            var d = Object.getOwnPropertyDescriptor(e, k);
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: function() {
                return e[k];
              }
            });
          }
        });
      }
      n.default = e;
      return Object.freeze(n);
    }
    var mod__namespace = _interopNamespaceDefault(mod);
    var utils__namespace = _interopNamespaceDefault(utils);
    var Point = secp256k1.secp256k1.ProjectivePoint;
    var THROW_BAD_PRIVATE = "Expected Private";
    var THROW_BAD_POINT = "Expected Point";
    var THROW_BAD_TWEAK = "Expected Tweak";
    var THROW_BAD_HASH = "Expected Hash";
    var THROW_BAD_SIGNATURE = "Expected Signature";
    var THROW_BAD_EXTRA_DATA = "Expected Extra Data (32 bytes)";
    var THROW_BAD_SCALAR = "Expected Scalar";
    var THROW_BAD_RECOVERY_ID = "Bad Recovery Id";
    var HASH_SIZE = 32;
    var TWEAK_SIZE = 32;
    var BN32_N = new Uint8Array([
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      254,
      186,
      174,
      220,
      230,
      175,
      72,
      160,
      59,
      191,
      210,
      94,
      140,
      208,
      54,
      65,
      65
    ]);
    var EXTRA_DATA_SIZE = 32;
    var BN32_ZERO = new Uint8Array(32);
    var BN32_P_MINUS_N = new Uint8Array([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      69,
      81,
      35,
      25,
      80,
      183,
      95,
      196,
      64,
      45,
      161,
      114,
      47,
      201,
      186,
      238
    ]);
    var _1n = BigInt(1);
    function isUint8Array(value) {
      return value instanceof Uint8Array;
    }
    function cmpBN32(data1, data2) {
      for (let i = 0; i < 32; ++i) {
        if (data1[i] !== data2[i]) {
          return data1[i] < data2[i] ? -1 : 1;
        }
      }
      return 0;
    }
    function isZero(x) {
      return cmpBN32(x, BN32_ZERO) === 0;
    }
    function isTweak(tweak) {
      if (!(tweak instanceof Uint8Array) || tweak.length !== TWEAK_SIZE || cmpBN32(tweak, BN32_N) >= 0) {
        return false;
      }
      return true;
    }
    function isSignature(signature) {
      return signature instanceof Uint8Array && signature.length === 64 && cmpBN32(signature.subarray(0, 32), BN32_N) < 0 && cmpBN32(signature.subarray(32, 64), BN32_N) < 0;
    }
    function isSigrLessThanPMinusN(signature) {
      return isUint8Array(signature) && signature.length === 64 && cmpBN32(signature.subarray(0, 32), BN32_P_MINUS_N) < 0;
    }
    function isSignatureNonzeroRS(signature) {
      return !(isZero(signature.subarray(0, 32)) || isZero(signature.subarray(32, 64)));
    }
    function isHash(h) {
      return h instanceof Uint8Array && h.length === HASH_SIZE;
    }
    function isExtraData(e) {
      return e === void 0 || e instanceof Uint8Array && e.length === EXTRA_DATA_SIZE;
    }
    function normalizeScalar(scalar) {
      let num;
      if (typeof scalar === "bigint") {
        num = scalar;
      } else if (typeof scalar === "number" && Number.isSafeInteger(scalar) && scalar >= 0) {
        num = BigInt(scalar);
      } else if (typeof scalar === "string") {
        if (scalar.length !== 64)
          throw new Error("Expected 32 bytes of private scalar");
        num = utils__namespace.hexToNumber(scalar);
      } else if (scalar instanceof Uint8Array) {
        if (scalar.length !== 32)
          throw new Error("Expected 32 bytes of private scalar");
        num = utils__namespace.bytesToNumberBE(scalar);
      } else {
        throw new TypeError("Expected valid private scalar");
      }
      if (num < 0) throw new Error("Expected private scalar >= 0");
      return num;
    }
    function normalizePrivateKey(privateKey) {
      return secp256k1.secp256k1.utils.normPrivateKeyToScalar(privateKey);
    }
    function _privateAdd(privateKey, tweak) {
      const p = normalizePrivateKey(privateKey);
      const t = normalizeScalar(tweak);
      const add = utils__namespace.numberToBytesBE(mod__namespace.mod(p + t, secp256k1.secp256k1.CURVE.n), 32);
      return secp256k1.secp256k1.utils.isValidPrivateKey(add) ? add : null;
    }
    function _privateSub(privateKey, tweak) {
      const p = normalizePrivateKey(privateKey);
      const t = normalizeScalar(tweak);
      const sub = utils__namespace.numberToBytesBE(mod__namespace.mod(p - t, secp256k1.secp256k1.CURVE.n), 32);
      return secp256k1.secp256k1.utils.isValidPrivateKey(sub) ? sub : null;
    }
    function _privateNegate(privateKey) {
      const p = normalizePrivateKey(privateKey);
      const not = utils__namespace.numberToBytesBE(secp256k1.secp256k1.CURVE.n - p, 32);
      return secp256k1.secp256k1.utils.isValidPrivateKey(not) ? not : null;
    }
    function _pointAddScalar(p, tweak, isCompressed) {
      const P = fromHex(p);
      const t = normalizeScalar(tweak);
      const Q = Point.BASE.multiplyAndAddUnsafe(P, t, _1n);
      if (!Q) throw new Error("Tweaked point at infinity");
      return Q.toRawBytes(isCompressed);
    }
    function _pointMultiply(p, tweak, isCompressed) {
      const P = fromHex(p);
      const h = typeof tweak === "string" ? tweak : utils__namespace.bytesToHex(tweak);
      const t = utils__namespace.hexToNumber(h);
      return P.multiply(t).toRawBytes(isCompressed);
    }
    function assumeCompression(compressed, p) {
      if (compressed === void 0) {
        return p !== void 0 ? isPointCompressed(p) : true;
      }
      return !!compressed;
    }
    function throwToNull(fn) {
      try {
        return fn();
      } catch (e) {
        return null;
      }
    }
    function fromXOnly(bytes) {
      return secp256k1.schnorr.utils.lift_x(utils__namespace.bytesToNumberBE(bytes));
    }
    function fromHex(bytes) {
      return bytes.length === 32 ? fromXOnly(bytes) : Point.fromHex(bytes);
    }
    function _isPoint(p, xOnly) {
      if (p.length === 32 !== xOnly) return false;
      try {
        if (xOnly) return !!fromXOnly(p);
        else return !!Point.fromHex(p);
      } catch (e) {
        return false;
      }
    }
    function isPoint(p) {
      return _isPoint(p, false);
    }
    function isPointCompressed(p) {
      const PUBLIC_KEY_COMPRESSED_SIZE = 33;
      return _isPoint(p, false) && p.length === PUBLIC_KEY_COMPRESSED_SIZE;
    }
    function isPrivate(d) {
      return secp256k1.secp256k1.utils.isValidPrivateKey(d);
    }
    function isXOnlyPoint(p) {
      return _isPoint(p, true);
    }
    function xOnlyPointAddTweak(p, tweak) {
      if (!isXOnlyPoint(p)) {
        throw new Error(THROW_BAD_POINT);
      }
      if (!isTweak(tweak)) {
        throw new Error(THROW_BAD_TWEAK);
      }
      return throwToNull(() => {
        const P = _pointAddScalar(p, tweak, true);
        const parity = P[0] % 2 === 1 ? 1 : 0;
        return { parity, xOnlyPubkey: P.slice(1) };
      });
    }
    function xOnlyPointFromPoint(p) {
      if (!isPoint(p)) {
        throw new Error(THROW_BAD_POINT);
      }
      return p.slice(1, 33);
    }
    function pointFromScalar(sk, compressed) {
      if (!isPrivate(sk)) {
        throw new Error(THROW_BAD_PRIVATE);
      }
      return throwToNull(
        () => secp256k1.secp256k1.getPublicKey(sk, assumeCompression(compressed))
      );
    }
    function xOnlyPointFromScalar(d) {
      if (!isPrivate(d)) {
        throw new Error(THROW_BAD_PRIVATE);
      }
      return xOnlyPointFromPoint(pointFromScalar(d));
    }
    function pointCompress(p, compressed) {
      if (!isPoint(p)) {
        throw new Error(THROW_BAD_POINT);
      }
      return fromHex(p).toRawBytes(assumeCompression(compressed, p));
    }
    function pointMultiply(a, tweak, compressed) {
      if (!isPoint(a)) {
        throw new Error(THROW_BAD_POINT);
      }
      if (!isTweak(tweak)) {
        throw new Error(THROW_BAD_TWEAK);
      }
      return throwToNull(
        () => _pointMultiply(a, tweak, assumeCompression(compressed, a))
      );
    }
    function pointAdd(a, b, compressed) {
      if (!isPoint(a) || !isPoint(b)) {
        throw new Error(THROW_BAD_POINT);
      }
      return throwToNull(() => {
        const A = fromHex(a);
        const B = fromHex(b);
        if (A.equals(B.negate())) {
          return null;
        } else {
          return A.add(B).toRawBytes(assumeCompression(compressed, a));
        }
      });
    }
    function pointAddScalar(p, tweak, compressed) {
      if (!isPoint(p)) {
        throw new Error(THROW_BAD_POINT);
      }
      if (!isTweak(tweak)) {
        throw new Error(THROW_BAD_TWEAK);
      }
      return throwToNull(
        () => _pointAddScalar(p, tweak, assumeCompression(compressed, p))
      );
    }
    function privateAdd(d, tweak) {
      if (!isPrivate(d)) {
        throw new Error(THROW_BAD_PRIVATE);
      }
      if (!isTweak(tweak)) {
        throw new Error(THROW_BAD_TWEAK);
      }
      return throwToNull(() => _privateAdd(d, tweak));
    }
    function privateSub(d, tweak) {
      if (!isPrivate(d)) {
        throw new Error(THROW_BAD_PRIVATE);
      }
      if (!isTweak(tweak)) {
        throw new Error(THROW_BAD_TWEAK);
      }
      return throwToNull(() => _privateSub(d, tweak));
    }
    function privateNegate(d) {
      if (!isPrivate(d)) {
        throw new Error(THROW_BAD_PRIVATE);
      }
      return _privateNegate(d);
    }
    function sign(h, d, e) {
      if (!isPrivate(d)) {
        throw new Error(THROW_BAD_PRIVATE);
      }
      if (!isHash(h)) {
        throw new Error(THROW_BAD_SCALAR);
      }
      if (!isExtraData(e)) {
        throw new Error(THROW_BAD_EXTRA_DATA);
      }
      return secp256k1.secp256k1.sign(h, d, { extraEntropy: e }).toCompactRawBytes();
    }
    function signRecoverable(h, d, e) {
      if (!isPrivate(d)) {
        throw new Error(THROW_BAD_PRIVATE);
      }
      if (!isHash(h)) {
        throw new Error(THROW_BAD_SCALAR);
      }
      if (!isExtraData(e)) {
        throw new Error(THROW_BAD_EXTRA_DATA);
      }
      const sig = secp256k1.secp256k1.sign(h, d, { extraEntropy: e });
      return {
        signature: sig.toCompactRawBytes(),
        recoveryId: sig.recovery
      };
    }
    function signSchnorr(h, d, e) {
      if (!isPrivate(d)) {
        throw new Error(THROW_BAD_PRIVATE);
      }
      if (!isHash(h)) {
        throw new Error(THROW_BAD_SCALAR);
      }
      if (!isExtraData(e)) {
        throw new Error(THROW_BAD_EXTRA_DATA);
      }
      return secp256k1.schnorr.sign(h, d, e);
    }
    function recover(h, signature, recoveryId, compressed) {
      if (!isHash(h)) {
        throw new Error(THROW_BAD_HASH);
      }
      if (!isSignature(signature) || !isSignatureNonzeroRS(signature)) {
        throw new Error(THROW_BAD_SIGNATURE);
      }
      if (recoveryId & 2) {
        if (!isSigrLessThanPMinusN(signature))
          throw new Error(THROW_BAD_RECOVERY_ID);
      }
      if (!isXOnlyPoint(signature.subarray(0, 32))) {
        throw new Error(THROW_BAD_SIGNATURE);
      }
      const s = secp256k1.secp256k1.Signature.fromCompact(signature).addRecoveryBit(recoveryId);
      const Q = s.recoverPublicKey(h);
      if (!Q) throw new Error(THROW_BAD_SIGNATURE);
      return Q.toRawBytes(assumeCompression(compressed));
    }
    function verify(h, Q, signature, strict) {
      if (!isPoint(Q)) {
        throw new Error(THROW_BAD_POINT);
      }
      if (!isSignature(signature)) {
        throw new Error(THROW_BAD_SIGNATURE);
      }
      if (!isHash(h)) {
        throw new Error(THROW_BAD_SCALAR);
      }
      return secp256k1.secp256k1.verify(signature, h, Q, { lowS: strict });
    }
    function verifySchnorr(h, Q, signature) {
      if (!isXOnlyPoint(Q)) {
        throw new Error(THROW_BAD_POINT);
      }
      if (!isSignature(signature)) {
        throw new Error(THROW_BAD_SIGNATURE);
      }
      if (!isHash(h)) {
        throw new Error(THROW_BAD_SCALAR);
      }
      return secp256k1.schnorr.verify(signature, h, Q);
    }
    exports.isPoint = isPoint;
    exports.isPointCompressed = isPointCompressed;
    exports.isPrivate = isPrivate;
    exports.isXOnlyPoint = isXOnlyPoint;
    exports.pointAdd = pointAdd;
    exports.pointAddScalar = pointAddScalar;
    exports.pointCompress = pointCompress;
    exports.pointFromScalar = pointFromScalar;
    exports.pointMultiply = pointMultiply;
    exports.privateAdd = privateAdd;
    exports.privateNegate = privateNegate;
    exports.privateSub = privateSub;
    exports.recover = recover;
    exports.sign = sign;
    exports.signRecoverable = signRecoverable;
    exports.signSchnorr = signSchnorr;
    exports.verify = verify;
    exports.verifySchnorr = verifySchnorr;
    exports.xOnlyPointAddTweak = xOnlyPointAddTweak;
    exports.xOnlyPointFromPoint = xOnlyPointFromPoint;
    exports.xOnlyPointFromScalar = xOnlyPointFromScalar;
  }
});
export default require_dist();
/*! Bundled license information:

@noble/curves/utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/abstract/modular.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/abstract/curve.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/abstract/weierstrass.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/_shortw_utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=@bitcoinerlab_secp256k1.js.map
