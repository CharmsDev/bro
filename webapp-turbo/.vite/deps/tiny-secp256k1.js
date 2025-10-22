import "./chunk-2TUXWMP5.js";

// node_modules/tiny-secp256k1/node_modules/uint8array-tools/src/mjs/browser.js
var HEX_STRINGS = "0123456789abcdefABCDEF";
var HEX_CODES = HEX_STRINGS.split("").map((c) => c.codePointAt(0));
var HEX_CODEPOINTS = Array(256).fill(true).map((_, i) => {
  const s = String.fromCodePoint(i);
  const index = HEX_STRINGS.indexOf(s);
  return index < 0 ? void 0 : index < 16 ? index : index - 6;
});
var ENCODER = new TextEncoder();
var DECODER = new TextDecoder("ascii");
function compare(v1, v2) {
  const minLength = Math.min(v1.length, v2.length);
  for (let i = 0; i < minLength; ++i) {
    if (v1[i] !== v2[i]) {
      return v1[i] < v2[i] ? -1 : 1;
    }
  }
  return v1.length === v2.length ? 0 : v1.length > v2.length ? 1 : -1;
}

// node_modules/tiny-secp256k1/lib/validate_error.js
var ERROR_BAD_PRIVATE = 0;
var ERROR_BAD_POINT = 1;
var ERROR_BAD_TWEAK = 2;
var ERROR_BAD_HASH = 3;
var ERROR_BAD_SIGNATURE = 4;
var ERROR_BAD_EXTRA_DATA = 5;
var ERROR_BAD_PARITY = 6;
var ERROR_BAD_RECOVERY_ID = 7;
var ERRORS_MESSAGES = {
  [ERROR_BAD_PRIVATE.toString()]: "Expected Private",
  [ERROR_BAD_POINT.toString()]: "Expected Point",
  [ERROR_BAD_TWEAK.toString()]: "Expected Tweak",
  [ERROR_BAD_HASH.toString()]: "Expected Hash",
  [ERROR_BAD_SIGNATURE.toString()]: "Expected Signature",
  [ERROR_BAD_EXTRA_DATA.toString()]: "Expected Extra Data (32 bytes)",
  [ERROR_BAD_PARITY.toString()]: "Expected Parity (1 | 0)",
  [ERROR_BAD_RECOVERY_ID.toString()]: "Bad Recovery Id"
};
function throwError(errcode) {
  const message = ERRORS_MESSAGES[errcode.toString()] || `Unknow error code: ${errcode}`;
  throw new TypeError(message);
}

// node_modules/tiny-secp256k1/lib/validate.js
var PRIVATE_KEY_SIZE = 32;
var PUBLIC_KEY_COMPRESSED_SIZE = 33;
var PUBLIC_KEY_UNCOMPRESSED_SIZE = 65;
var X_ONLY_PUBLIC_KEY_SIZE = 32;
var TWEAK_SIZE = 32;
var HASH_SIZE = 32;
var EXTRA_DATA_SIZE = 32;
var SIGNATURE_SIZE = 64;
var BN32_ZERO = new Uint8Array(32);
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
function isPrivate(x) {
  return isUint8Array(x) && x.length === PRIVATE_KEY_SIZE && cmpBN32(x, BN32_ZERO) > 0 && cmpBN32(x, BN32_N) < 0;
}
function isPoint(p) {
  return isUint8Array(p) && (p.length === PUBLIC_KEY_COMPRESSED_SIZE || p.length === PUBLIC_KEY_UNCOMPRESSED_SIZE || p.length === X_ONLY_PUBLIC_KEY_SIZE);
}
function isXOnlyPoint(p) {
  return isUint8Array(p) && p.length === X_ONLY_PUBLIC_KEY_SIZE;
}
function isDERPoint(p) {
  return isUint8Array(p) && (p.length === PUBLIC_KEY_COMPRESSED_SIZE || p.length === PUBLIC_KEY_UNCOMPRESSED_SIZE);
}
function isPointCompressed(p) {
  return isUint8Array(p) && p.length === PUBLIC_KEY_COMPRESSED_SIZE;
}
function isTweak(tweak) {
  return isUint8Array(tweak) && tweak.length === TWEAK_SIZE && cmpBN32(tweak, BN32_N) < 0;
}
function isHash(h) {
  return isUint8Array(h) && h.length === HASH_SIZE;
}
function isExtraData(e) {
  return e === void 0 || isUint8Array(e) && e.length === EXTRA_DATA_SIZE;
}
function isSignature(signature) {
  return isUint8Array(signature) && signature.length === 64 && cmpBN32(signature.subarray(0, 32), BN32_N) < 0 && cmpBN32(signature.subarray(32, 64), BN32_N) < 0;
}
function isSigrLessThanPMinusN(signature) {
  return isUint8Array(signature) && signature.length === 64 && cmpBN32(signature.subarray(0, 32), BN32_P_MINUS_N) < 0;
}
function validateParity(p) {
  if (p !== 0 && p !== 1)
    throwError(ERROR_BAD_PARITY);
}
function validatePrivate(d) {
  if (!isPrivate(d))
    throwError(ERROR_BAD_PRIVATE);
}
function validatePoint(p) {
  if (!isPoint(p))
    throwError(ERROR_BAD_POINT);
}
function validateXOnlyPoint(p) {
  if (!isXOnlyPoint(p))
    throwError(ERROR_BAD_POINT);
}
function validateTweak(tweak) {
  if (!isTweak(tweak))
    throwError(ERROR_BAD_TWEAK);
}
function validateHash(h) {
  if (!isHash(h))
    throwError(ERROR_BAD_HASH);
}
function validateExtraData(e) {
  if (!isExtraData(e))
    throwError(ERROR_BAD_EXTRA_DATA);
}
function validateSignature(signature) {
  if (!isSignature(signature))
    throwError(ERROR_BAD_SIGNATURE);
}
function validateSignatureCustom(validatorFn) {
  if (!validatorFn())
    throwError(ERROR_BAD_SIGNATURE);
}
function validateSignatureNonzeroRS(signature) {
  if (isZero(signature.subarray(0, 32)))
    throwError(ERROR_BAD_SIGNATURE);
  if (isZero(signature.subarray(32, 64)))
    throwError(ERROR_BAD_SIGNATURE);
}
function validateSigrPMinusN(signature) {
  if (!isSigrLessThanPMinusN(signature))
    throwError(ERROR_BAD_RECOVERY_ID);
}

// node_modules/tiny-secp256k1/lib/wasm_loader.browser.js
import * as wasm from "/Users/ricartjuncadella/Documents/Prj/bitcoinos/charms-bro/webapp-turbo/node_modules/tiny-secp256k1/lib/secp256k1.wasm";
var wasm_loader_browser_default = wasm;

// node_modules/tiny-secp256k1/lib/index.js
var WASM_BUFFER = new Uint8Array(wasm_loader_browser_default.memory.buffer);
var WASM_PRIVATE_KEY_PTR = wasm_loader_browser_default.PRIVATE_INPUT.value;
var WASM_PUBLIC_KEY_INPUT_PTR = wasm_loader_browser_default.PUBLIC_KEY_INPUT.value;
var WASM_PUBLIC_KEY_INPUT_PTR2 = wasm_loader_browser_default.PUBLIC_KEY_INPUT2.value;
var WASM_X_ONLY_PUBLIC_KEY_INPUT_PTR = wasm_loader_browser_default.X_ONLY_PUBLIC_KEY_INPUT.value;
var WASM_X_ONLY_PUBLIC_KEY_INPUT2_PTR = wasm_loader_browser_default.X_ONLY_PUBLIC_KEY_INPUT2.value;
var WASM_TWEAK_INPUT_PTR = wasm_loader_browser_default.TWEAK_INPUT.value;
var WASM_HASH_INPUT_PTR = wasm_loader_browser_default.HASH_INPUT.value;
var WASM_EXTRA_DATA_INPUT_PTR = wasm_loader_browser_default.EXTRA_DATA_INPUT.value;
var WASM_SIGNATURE_INPUT_PTR = wasm_loader_browser_default.SIGNATURE_INPUT.value;
var PRIVATE_KEY_INPUT = WASM_BUFFER.subarray(WASM_PRIVATE_KEY_PTR, WASM_PRIVATE_KEY_PTR + PRIVATE_KEY_SIZE);
var PUBLIC_KEY_INPUT = WASM_BUFFER.subarray(WASM_PUBLIC_KEY_INPUT_PTR, WASM_PUBLIC_KEY_INPUT_PTR + PUBLIC_KEY_UNCOMPRESSED_SIZE);
var PUBLIC_KEY_INPUT2 = WASM_BUFFER.subarray(WASM_PUBLIC_KEY_INPUT_PTR2, WASM_PUBLIC_KEY_INPUT_PTR2 + PUBLIC_KEY_UNCOMPRESSED_SIZE);
var X_ONLY_PUBLIC_KEY_INPUT = WASM_BUFFER.subarray(WASM_X_ONLY_PUBLIC_KEY_INPUT_PTR, WASM_X_ONLY_PUBLIC_KEY_INPUT_PTR + X_ONLY_PUBLIC_KEY_SIZE);
var X_ONLY_PUBLIC_KEY_INPUT2 = WASM_BUFFER.subarray(WASM_X_ONLY_PUBLIC_KEY_INPUT2_PTR, WASM_X_ONLY_PUBLIC_KEY_INPUT2_PTR + X_ONLY_PUBLIC_KEY_SIZE);
var TWEAK_INPUT = WASM_BUFFER.subarray(WASM_TWEAK_INPUT_PTR, WASM_TWEAK_INPUT_PTR + TWEAK_SIZE);
var HASH_INPUT = WASM_BUFFER.subarray(WASM_HASH_INPUT_PTR, WASM_HASH_INPUT_PTR + HASH_SIZE);
var EXTRA_DATA_INPUT = WASM_BUFFER.subarray(WASM_EXTRA_DATA_INPUT_PTR, WASM_EXTRA_DATA_INPUT_PTR + EXTRA_DATA_SIZE);
var SIGNATURE_INPUT = WASM_BUFFER.subarray(WASM_SIGNATURE_INPUT_PTR, WASM_SIGNATURE_INPUT_PTR + SIGNATURE_SIZE);
function assumeCompression(compressed, p) {
  if (compressed === void 0) {
    return p !== void 0 ? p.length : PUBLIC_KEY_COMPRESSED_SIZE;
  }
  return compressed ? PUBLIC_KEY_COMPRESSED_SIZE : PUBLIC_KEY_UNCOMPRESSED_SIZE;
}
function _isPoint(p) {
  try {
    PUBLIC_KEY_INPUT.set(p);
    return wasm_loader_browser_default.isPoint(p.length) === 1;
  } finally {
    PUBLIC_KEY_INPUT.fill(0);
  }
}
function __initializeContext() {
  wasm_loader_browser_default.initializeContext();
}
function isPoint2(p) {
  return isDERPoint(p) && _isPoint(p);
}
function isPointCompressed2(p) {
  return isPointCompressed(p) && _isPoint(p);
}
function isXOnlyPoint2(p) {
  return isXOnlyPoint(p) && _isPoint(p);
}
function isPrivate2(d) {
  return isPrivate(d);
}
function pointAdd(pA, pB, compressed) {
  validatePoint(pA);
  validatePoint(pB);
  const outputlen = assumeCompression(compressed, pA);
  try {
    PUBLIC_KEY_INPUT.set(pA);
    PUBLIC_KEY_INPUT2.set(pB);
    return wasm_loader_browser_default.pointAdd(pA.length, pB.length, outputlen) === 1 ? PUBLIC_KEY_INPUT.slice(0, outputlen) : null;
  } finally {
    PUBLIC_KEY_INPUT.fill(0);
    PUBLIC_KEY_INPUT2.fill(0);
  }
}
function pointAddScalar(p, tweak, compressed) {
  validatePoint(p);
  validateTweak(tweak);
  const outputlen = assumeCompression(compressed, p);
  try {
    PUBLIC_KEY_INPUT.set(p);
    TWEAK_INPUT.set(tweak);
    return wasm_loader_browser_default.pointAddScalar(p.length, outputlen) === 1 ? PUBLIC_KEY_INPUT.slice(0, outputlen) : null;
  } finally {
    PUBLIC_KEY_INPUT.fill(0);
    TWEAK_INPUT.fill(0);
  }
}
function pointCompress(p, compressed) {
  validatePoint(p);
  const outputlen = assumeCompression(compressed, p);
  try {
    PUBLIC_KEY_INPUT.set(p);
    wasm_loader_browser_default.pointCompress(p.length, outputlen);
    return PUBLIC_KEY_INPUT.slice(0, outputlen);
  } finally {
    PUBLIC_KEY_INPUT.fill(0);
  }
}
function pointFromScalar(d, compressed) {
  validatePrivate(d);
  const outputlen = assumeCompression(compressed);
  try {
    PRIVATE_KEY_INPUT.set(d);
    return wasm_loader_browser_default.pointFromScalar(outputlen) === 1 ? PUBLIC_KEY_INPUT.slice(0, outputlen) : null;
  } finally {
    PRIVATE_KEY_INPUT.fill(0);
    PUBLIC_KEY_INPUT.fill(0);
  }
}
function xOnlyPointFromScalar(d) {
  validatePrivate(d);
  try {
    PRIVATE_KEY_INPUT.set(d);
    wasm_loader_browser_default.xOnlyPointFromScalar();
    return X_ONLY_PUBLIC_KEY_INPUT.slice(0, X_ONLY_PUBLIC_KEY_SIZE);
  } finally {
    PRIVATE_KEY_INPUT.fill(0);
    X_ONLY_PUBLIC_KEY_INPUT.fill(0);
  }
}
function xOnlyPointFromPoint(p) {
  validatePoint(p);
  try {
    PUBLIC_KEY_INPUT.set(p);
    wasm_loader_browser_default.xOnlyPointFromPoint(p.length);
    return X_ONLY_PUBLIC_KEY_INPUT.slice(0, X_ONLY_PUBLIC_KEY_SIZE);
  } finally {
    PUBLIC_KEY_INPUT.fill(0);
    X_ONLY_PUBLIC_KEY_INPUT.fill(0);
  }
}
function pointMultiply(p, tweak, compressed) {
  validatePoint(p);
  validateTweak(tweak);
  const outputlen = assumeCompression(compressed, p);
  try {
    PUBLIC_KEY_INPUT.set(p);
    TWEAK_INPUT.set(tweak);
    return wasm_loader_browser_default.pointMultiply(p.length, outputlen) === 1 ? PUBLIC_KEY_INPUT.slice(0, outputlen) : null;
  } finally {
    PUBLIC_KEY_INPUT.fill(0);
    TWEAK_INPUT.fill(0);
  }
}
function privateAdd(d, tweak) {
  validatePrivate(d);
  validateTweak(tweak);
  try {
    PRIVATE_KEY_INPUT.set(d);
    TWEAK_INPUT.set(tweak);
    return wasm_loader_browser_default.privateAdd() === 1 ? PRIVATE_KEY_INPUT.slice(0, PRIVATE_KEY_SIZE) : null;
  } finally {
    PRIVATE_KEY_INPUT.fill(0);
    TWEAK_INPUT.fill(0);
  }
}
function privateSub(d, tweak) {
  validatePrivate(d);
  validateTweak(tweak);
  if (isZero(tweak)) {
    return new Uint8Array(d);
  }
  try {
    PRIVATE_KEY_INPUT.set(d);
    TWEAK_INPUT.set(tweak);
    return wasm_loader_browser_default.privateSub() === 1 ? PRIVATE_KEY_INPUT.slice(0, PRIVATE_KEY_SIZE) : null;
  } finally {
    PRIVATE_KEY_INPUT.fill(0);
    TWEAK_INPUT.fill(0);
  }
}
function privateNegate(d) {
  validatePrivate(d);
  try {
    PRIVATE_KEY_INPUT.set(d);
    wasm_loader_browser_default.privateNegate();
    return PRIVATE_KEY_INPUT.slice(0, PRIVATE_KEY_SIZE);
  } finally {
    PRIVATE_KEY_INPUT.fill(0);
  }
}
function xOnlyPointAddTweak(p, tweak) {
  validateXOnlyPoint(p);
  validateTweak(tweak);
  try {
    X_ONLY_PUBLIC_KEY_INPUT.set(p);
    TWEAK_INPUT.set(tweak);
    const parity = wasm_loader_browser_default.xOnlyPointAddTweak();
    return parity !== -1 ? {
      parity,
      xOnlyPubkey: X_ONLY_PUBLIC_KEY_INPUT.slice(0, X_ONLY_PUBLIC_KEY_SIZE)
    } : null;
  } finally {
    X_ONLY_PUBLIC_KEY_INPUT.fill(0);
    TWEAK_INPUT.fill(0);
  }
}
function xOnlyPointAddTweakCheck(point, tweak, resultToCheck, tweakParity) {
  validateXOnlyPoint(point);
  validateXOnlyPoint(resultToCheck);
  validateTweak(tweak);
  const hasParity = tweakParity !== void 0;
  if (hasParity)
    validateParity(tweakParity);
  try {
    X_ONLY_PUBLIC_KEY_INPUT.set(point);
    X_ONLY_PUBLIC_KEY_INPUT2.set(resultToCheck);
    TWEAK_INPUT.set(tweak);
    if (hasParity) {
      return wasm_loader_browser_default.xOnlyPointAddTweakCheck(tweakParity) === 1;
    } else {
      wasm_loader_browser_default.xOnlyPointAddTweak();
      const newKey = X_ONLY_PUBLIC_KEY_INPUT.slice(0, X_ONLY_PUBLIC_KEY_SIZE);
      return compare(newKey, resultToCheck) === 0;
    }
  } finally {
    X_ONLY_PUBLIC_KEY_INPUT.fill(0);
    X_ONLY_PUBLIC_KEY_INPUT2.fill(0);
    TWEAK_INPUT.fill(0);
  }
}
function sign(h, d, e) {
  validateHash(h);
  validatePrivate(d);
  validateExtraData(e);
  try {
    HASH_INPUT.set(h);
    PRIVATE_KEY_INPUT.set(d);
    if (e !== void 0)
      EXTRA_DATA_INPUT.set(e);
    wasm_loader_browser_default.sign(e === void 0 ? 0 : 1);
    return SIGNATURE_INPUT.slice(0, SIGNATURE_SIZE);
  } finally {
    HASH_INPUT.fill(0);
    PRIVATE_KEY_INPUT.fill(0);
    if (e !== void 0)
      EXTRA_DATA_INPUT.fill(0);
    SIGNATURE_INPUT.fill(0);
  }
}
function signRecoverable(h, d, e) {
  validateHash(h);
  validatePrivate(d);
  validateExtraData(e);
  try {
    HASH_INPUT.set(h);
    PRIVATE_KEY_INPUT.set(d);
    if (e !== void 0)
      EXTRA_DATA_INPUT.set(e);
    const recoveryId = wasm_loader_browser_default.signRecoverable(e === void 0 ? 0 : 1);
    const signature = SIGNATURE_INPUT.slice(0, SIGNATURE_SIZE);
    return {
      signature,
      recoveryId
    };
  } finally {
    HASH_INPUT.fill(0);
    PRIVATE_KEY_INPUT.fill(0);
    if (e !== void 0)
      EXTRA_DATA_INPUT.fill(0);
    SIGNATURE_INPUT.fill(0);
  }
}
function signSchnorr(h, d, e) {
  validateHash(h);
  validatePrivate(d);
  validateExtraData(e);
  try {
    HASH_INPUT.set(h);
    PRIVATE_KEY_INPUT.set(d);
    if (e !== void 0)
      EXTRA_DATA_INPUT.set(e);
    wasm_loader_browser_default.signSchnorr(e === void 0 ? 0 : 1);
    return SIGNATURE_INPUT.slice(0, SIGNATURE_SIZE);
  } finally {
    HASH_INPUT.fill(0);
    PRIVATE_KEY_INPUT.fill(0);
    if (e !== void 0)
      EXTRA_DATA_INPUT.fill(0);
    SIGNATURE_INPUT.fill(0);
  }
}
function verify(h, Q, signature, strict = false) {
  validateHash(h);
  validatePoint(Q);
  validateSignature(signature);
  try {
    HASH_INPUT.set(h);
    PUBLIC_KEY_INPUT.set(Q);
    SIGNATURE_INPUT.set(signature);
    return wasm_loader_browser_default.verify(Q.length, strict === true ? 1 : 0) === 1 ? true : false;
  } finally {
    HASH_INPUT.fill(0);
    PUBLIC_KEY_INPUT.fill(0);
    SIGNATURE_INPUT.fill(0);
  }
}
function recover(h, signature, recoveryId, compressed = false) {
  validateHash(h);
  validateSignature(signature);
  validateSignatureNonzeroRS(signature);
  if (recoveryId & 2) {
    validateSigrPMinusN(signature);
  }
  validateSignatureCustom(() => isXOnlyPoint2(signature.subarray(0, 32)));
  const outputlen = assumeCompression(compressed);
  try {
    HASH_INPUT.set(h);
    SIGNATURE_INPUT.set(signature);
    return wasm_loader_browser_default.recover(outputlen, recoveryId) === 1 ? PUBLIC_KEY_INPUT.slice(0, outputlen) : null;
  } finally {
    HASH_INPUT.fill(0);
    SIGNATURE_INPUT.fill(0);
    PUBLIC_KEY_INPUT.fill(0);
  }
}
function verifySchnorr(h, Q, signature) {
  validateHash(h);
  validateXOnlyPoint(Q);
  validateSignature(signature);
  try {
    HASH_INPUT.set(h);
    X_ONLY_PUBLIC_KEY_INPUT.set(Q);
    SIGNATURE_INPUT.set(signature);
    return wasm_loader_browser_default.verifySchnorr() === 1 ? true : false;
  } finally {
    HASH_INPUT.fill(0);
    X_ONLY_PUBLIC_KEY_INPUT.fill(0);
    SIGNATURE_INPUT.fill(0);
  }
}
export {
  __initializeContext,
  isPoint2 as isPoint,
  isPointCompressed2 as isPointCompressed,
  isPrivate2 as isPrivate,
  isXOnlyPoint2 as isXOnlyPoint,
  pointAdd,
  pointAddScalar,
  pointCompress,
  pointFromScalar,
  pointMultiply,
  privateAdd,
  privateNegate,
  privateSub,
  recover,
  sign,
  signRecoverable,
  signSchnorr,
  verify,
  verifySchnorr,
  xOnlyPointAddTweak,
  xOnlyPointAddTweakCheck,
  xOnlyPointFromPoint,
  xOnlyPointFromScalar
};
//# sourceMappingURL=tiny-secp256k1.js.map
