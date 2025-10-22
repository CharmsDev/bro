import {
  sha256
} from "./chunk-2MDE53YM.js";
import {
  __publicField
} from "./chunk-2TUXWMP5.js";

// node_modules/@noble/hashes/esm/sha256.js
var sha2562 = sha256;

// node_modules/uint8array-tools/src/mjs/browser.js
var HEX_STRINGS = "0123456789abcdefABCDEF";
var HEX_CODES = HEX_STRINGS.split("").map((c) => c.codePointAt(0));
var HEX_CODEPOINTS = Array(256).fill(true).map((_, i) => {
  const s = String.fromCodePoint(i);
  const index = HEX_STRINGS.indexOf(s);
  return index < 0 ? void 0 : index < 16 ? index : index - 6;
});
var ENCODER = new TextEncoder();
var DECODER = new TextDecoder();
function fromUtf8(s) {
  return ENCODER.encode(s);
}
function concat(arrays) {
  const totalLength = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}
function fromHex(hexString) {
  const hexBytes = ENCODER.encode(hexString || "");
  const resultBytes = new Uint8Array(Math.floor(hexBytes.length / 2));
  let i;
  for (i = 0; i < resultBytes.length; i++) {
    const a = HEX_CODEPOINTS[hexBytes[i * 2]];
    const b = HEX_CODEPOINTS[hexBytes[i * 2 + 1]];
    if (a === void 0 || b === void 0) {
      break;
    }
    resultBytes[i] = a << 4 | b;
  }
  return i === resultBytes.length ? resultBytes : resultBytes.slice(0, i);
}
function compare(v1, v2) {
  const minLength = Math.min(v1.length, v2.length);
  for (let i = 0; i < minLength; ++i) {
    if (v1[i] !== v2[i]) {
      return v1[i] < v2[i] ? -1 : 1;
    }
  }
  return v1.length === v2.length ? 0 : v1.length > v2.length ? 1 : -1;
}
function writeUInt8(buffer, offset, value) {
  if (offset + 1 > buffer.length) {
    throw new Error("Offset is outside the bounds of Uint8Array");
  }
  if (value > 255) {
    throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${255}. Received ${value}`);
  }
  buffer[offset] = value;
}
function writeUInt32(buffer, offset, value, littleEndian) {
  if (offset + 4 > buffer.length) {
    throw new Error("Offset is outside the bounds of Uint8Array");
  }
  littleEndian = littleEndian.toUpperCase();
  if (value > 4294967295) {
    throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${4294967295}. Received ${value}`);
  }
  if (littleEndian === "LE") {
    buffer[offset] = value & 255;
    buffer[offset + 1] = value >> 8 & 255;
    buffer[offset + 2] = value >> 16 & 255;
    buffer[offset + 3] = value >> 24 & 255;
  } else {
    buffer[offset] = value >> 24 & 255;
    buffer[offset + 1] = value >> 16 & 255;
    buffer[offset + 2] = value >> 8 & 255;
    buffer[offset + 3] = value & 255;
  }
}
function readUInt32(buffer, offset, littleEndian) {
  if (offset + 4 > buffer.length) {
    throw new Error("Offset is outside the bounds of Uint8Array");
  }
  littleEndian = littleEndian.toUpperCase();
  if (littleEndian === "LE") {
    let num = 0;
    num = (num << 8) + buffer[offset + 3] >>> 0;
    num = (num << 8) + buffer[offset + 2] >>> 0;
    num = (num << 8) + buffer[offset + 1] >>> 0;
    num = (num << 8) + buffer[offset] >>> 0;
    return num;
  } else {
    let num = 0;
    num = (num << 8) + buffer[offset] >>> 0;
    num = (num << 8) + buffer[offset + 1] >>> 0;
    num = (num << 8) + buffer[offset + 2] >>> 0;
    num = (num << 8) + buffer[offset + 3] >>> 0;
    return num;
  }
}

// node_modules/valibot/dist/index.js
var EMOJI_REGEX = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex, regexp/no-dupe-disjunctions -- false positives
  new RegExp("^(?:[\\u{1F1E6}-\\u{1F1FF}]{2}|\\u{1F3F4}[\\u{E0061}-\\u{E007A}]{2}[\\u{E0030}-\\u{E0039}\\u{E0061}-\\u{E007A}]{1,3}\\u{E007F}|(?:\\p{Emoji}\\uFE0F\\u20E3?|\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation})(?:\\u200D(?:\\p{Emoji}\\uFE0F\\u20E3?|\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation}))*)+$", "u")
);
var store;
function getGlobalConfig(config2) {
  return {
    lang: (config2 == null ? void 0 : config2.lang) ?? (store == null ? void 0 : store.lang),
    message: config2 == null ? void 0 : config2.message,
    abortEarly: (config2 == null ? void 0 : config2.abortEarly) ?? (store == null ? void 0 : store.abortEarly),
    abortPipeEarly: (config2 == null ? void 0 : config2.abortPipeEarly) ?? (store == null ? void 0 : store.abortPipeEarly)
  };
}
var store2;
function getGlobalMessage(lang) {
  return store2 == null ? void 0 : store2.get(lang);
}
var store3;
function getSchemaMessage(lang) {
  return store3 == null ? void 0 : store3.get(lang);
}
var store4;
function getSpecificMessage(reference, lang) {
  var _a;
  return (_a = store4 == null ? void 0 : store4.get(reference)) == null ? void 0 : _a.get(lang);
}
function _stringify(input) {
  var _a, _b;
  const type = typeof input;
  if (type === "string") {
    return `"${input}"`;
  }
  if (type === "number" || type === "bigint" || type === "boolean") {
    return `${input}`;
  }
  if (type === "object" || type === "function") {
    return (input && ((_b = (_a = Object.getPrototypeOf(input)) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name)) ?? "null";
  }
  return type;
}
function _addIssue(context, label, dataset, config2, other) {
  const input = other && "input" in other ? other.input : dataset.value;
  const expected = (other == null ? void 0 : other.expected) ?? context.expects ?? null;
  const received = (other == null ? void 0 : other.received) ?? _stringify(input);
  const issue = {
    kind: context.kind,
    type: context.type,
    input,
    expected,
    received,
    message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
    // @ts-expect-error
    requirement: context.requirement,
    path: other == null ? void 0 : other.path,
    issues: other == null ? void 0 : other.issues,
    lang: config2.lang,
    abortEarly: config2.abortEarly,
    abortPipeEarly: config2.abortPipeEarly
  };
  const isSchema = context.kind === "schema";
  const message = (other == null ? void 0 : other.message) ?? // @ts-expect-error
  context.message ?? getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? getSchemaMessage(issue.lang) : null) ?? config2.message ?? getGlobalMessage(issue.lang);
  if (message) {
    issue.message = typeof message === "function" ? message(issue) : message;
  }
  if (isSchema) {
    dataset.typed = false;
  }
  if (dataset.issues) {
    dataset.issues.push(issue);
  } else {
    dataset.issues = [issue];
  }
}
var ValiError = class extends Error {
  /**
   * Creates a Valibot error with useful information.
   *
   * @param issues The error issues.
   */
  constructor(issues) {
    super(issues[0].message);
    /**
     * The error issues.
     */
    __publicField(this, "issues");
    this.name = "ValiError";
    this.issues = issues;
  }
};
function integer(message) {
  return {
    kind: "validation",
    type: "integer",
    reference: integer,
    async: false,
    expects: null,
    requirement: Number.isInteger,
    message,
    _run(dataset, config2) {
      if (dataset.typed && !this.requirement(dataset.value)) {
        _addIssue(this, "integer", dataset, config2);
      }
      return dataset;
    }
  };
}
function length(requirement, message) {
  return {
    kind: "validation",
    type: "length",
    reference: length,
    async: false,
    expects: `${requirement}`,
    requirement,
    message,
    _run(dataset, config2) {
      if (dataset.typed && dataset.value.length !== this.requirement) {
        _addIssue(this, "length", dataset, config2, {
          received: `${dataset.value.length}`
        });
      }
      return dataset;
    }
  };
}
function maxValue(requirement, message) {
  return {
    kind: "validation",
    type: "max_value",
    reference: maxValue,
    async: false,
    expects: `<=${requirement instanceof Date ? requirement.toJSON() : _stringify(requirement)}`,
    requirement,
    message,
    _run(dataset, config2) {
      if (dataset.typed && dataset.value > this.requirement) {
        _addIssue(this, "value", dataset, config2, {
          received: dataset.value instanceof Date ? dataset.value.toJSON() : _stringify(dataset.value)
        });
      }
      return dataset;
    }
  };
}
function minValue(requirement, message) {
  return {
    kind: "validation",
    type: "min_value",
    reference: minValue,
    async: false,
    expects: `>=${requirement instanceof Date ? requirement.toJSON() : _stringify(requirement)}`,
    requirement,
    message,
    _run(dataset, config2) {
      if (dataset.typed && dataset.value < this.requirement) {
        _addIssue(this, "value", dataset, config2, {
          received: dataset.value instanceof Date ? dataset.value.toJSON() : _stringify(dataset.value)
        });
      }
      return dataset;
    }
  };
}
function regex(requirement, message) {
  return {
    kind: "validation",
    type: "regex",
    reference: regex,
    async: false,
    expects: `${requirement}`,
    requirement,
    message,
    _run(dataset, config2) {
      if (dataset.typed && !this.requirement.test(dataset.value)) {
        _addIssue(this, "format", dataset, config2);
      }
      return dataset;
    }
  };
}
function transform(operation) {
  return {
    kind: "transformation",
    type: "transform",
    reference: transform,
    async: false,
    operation,
    _run(dataset) {
      dataset.value = this.operation(dataset.value);
      return dataset;
    }
  };
}
function getDefault(schema, dataset, config2) {
  return typeof schema.default === "function" ? (
    // @ts-expect-error
    schema.default(dataset, config2)
  ) : (
    // @ts-expect-error
    schema.default
  );
}
function boolean(message) {
  return {
    kind: "schema",
    type: "boolean",
    reference: boolean,
    expects: "boolean",
    async: false,
    message,
    _run(dataset, config2) {
      if (typeof dataset.value === "boolean") {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function instance(class_, message) {
  return {
    kind: "schema",
    type: "instance",
    reference: instance,
    expects: class_.name,
    async: false,
    class: class_,
    message,
    _run(dataset, config2) {
      if (dataset.value instanceof this.class) {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function number(message) {
  return {
    kind: "schema",
    type: "number",
    reference: number,
    expects: "number",
    async: false,
    message,
    _run(dataset, config2) {
      if (typeof dataset.value === "number" && !isNaN(dataset.value)) {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function object(entries, message) {
  return {
    kind: "schema",
    type: "object",
    reference: object,
    expects: "Object",
    async: false,
    entries,
    message,
    _run(dataset, config2) {
      var _a;
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const key in this.entries) {
          const value2 = input[key];
          const valueDataset = this.entries[key]._run(
            { typed: false, value: value2 },
            config2
          );
          if (valueDataset.issues) {
            const pathItem = {
              type: "object",
              origin: "value",
              input,
              key,
              value: value2
            };
            for (const issue of valueDataset.issues) {
              if (issue.path) {
                issue.path.unshift(pathItem);
              } else {
                issue.path = [pathItem];
              }
              (_a = dataset.issues) == null ? void 0 : _a.push(issue);
            }
            if (!dataset.issues) {
              dataset.issues = valueDataset.issues;
            }
            if (config2.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!valueDataset.typed) {
            dataset.typed = false;
          }
          if (valueDataset.value !== void 0 || key in input) {
            dataset.value[key] = valueDataset.value;
          }
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function optional(wrapped, ...args) {
  const schema = {
    kind: "schema",
    type: "optional",
    reference: optional,
    expects: `${wrapped.expects} | undefined`,
    async: false,
    wrapped,
    _run(dataset, config2) {
      if (dataset.value === void 0) {
        if ("default" in this) {
          dataset.value = getDefault(
            this,
            dataset,
            config2
          );
        }
        if (dataset.value === void 0) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped._run(dataset, config2);
    }
  };
  if (0 in args) {
    schema.default = args[0];
  }
  return schema;
}
function string(message) {
  return {
    kind: "schema",
    type: "string",
    reference: string,
    expects: "string",
    async: false,
    message,
    _run(dataset, config2) {
      if (typeof dataset.value === "string") {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function _subIssues(datasets) {
  let issues;
  if (datasets) {
    for (const dataset of datasets) {
      if (issues) {
        issues.push(...dataset.issues);
      } else {
        issues = dataset.issues;
      }
    }
  }
  return issues;
}
function union(options, message) {
  return {
    kind: "schema",
    type: "union",
    reference: union,
    expects: [...new Set(options.map((option) => option.expects))].join(" | ") || "never",
    async: false,
    options,
    message,
    _run(dataset, config2) {
      let validDataset;
      let typedDatasets;
      let untypedDatasets;
      for (const schema of this.options) {
        const optionDataset = schema._run(
          { typed: false, value: dataset.value },
          config2
        );
        if (optionDataset.typed) {
          if (optionDataset.issues) {
            if (typedDatasets) {
              typedDatasets.push(optionDataset);
            } else {
              typedDatasets = [optionDataset];
            }
          } else {
            validDataset = optionDataset;
            break;
          }
        } else {
          if (untypedDatasets) {
            untypedDatasets.push(optionDataset);
          } else {
            untypedDatasets = [optionDataset];
          }
        }
      }
      if (validDataset) {
        return validDataset;
      }
      if (typedDatasets) {
        if (typedDatasets.length === 1) {
          return typedDatasets[0];
        }
        _addIssue(this, "type", dataset, config2, {
          issues: _subIssues(typedDatasets)
        });
        dataset.typed = true;
      } else if ((untypedDatasets == null ? void 0 : untypedDatasets.length) === 1) {
        return untypedDatasets[0];
      } else {
        _addIssue(this, "type", dataset, config2, {
          issues: _subIssues(untypedDatasets)
        });
      }
      return dataset;
    }
  };
}
function parse(schema, input, config2) {
  const dataset = schema._run(
    { typed: false, value: input },
    getGlobalConfig(config2)
  );
  if (dataset.issues) {
    throw new ValiError(dataset.issues);
  }
  return dataset.value;
}
function pipe(...pipe2) {
  return {
    ...pipe2[0],
    pipe: pipe2,
    _run(dataset, config2) {
      for (const item of pipe2) {
        if (item.kind !== "metadata") {
          if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
            dataset.typed = false;
            break;
          }
          if (!dataset.issues || !config2.abortEarly && !config2.abortPipeEarly) {
            dataset = item._run(dataset, config2);
          }
        }
      }
      return dataset;
    }
  };
}

// node_modules/wif/node_modules/base-x/src/esm/index.js
function base(ALPHABET2) {
  if (ALPHABET2.length >= 255) {
    throw new TypeError("Alphabet too long");
  }
  const BASE_MAP = new Uint8Array(256);
  for (let j = 0; j < BASE_MAP.length; j++) {
    BASE_MAP[j] = 255;
  }
  for (let i = 0; i < ALPHABET2.length; i++) {
    const x = ALPHABET2.charAt(i);
    const xc = x.charCodeAt(0);
    if (BASE_MAP[xc] !== 255) {
      throw new TypeError(x + " is ambiguous");
    }
    BASE_MAP[xc] = i;
  }
  const BASE = ALPHABET2.length;
  const LEADER = ALPHABET2.charAt(0);
  const FACTOR = Math.log(BASE) / Math.log(256);
  const iFACTOR = Math.log(256) / Math.log(BASE);
  function encode2(source) {
    if (source instanceof Uint8Array) {
    } else if (ArrayBuffer.isView(source)) {
      source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else if (Array.isArray(source)) {
      source = Uint8Array.from(source);
    }
    if (!(source instanceof Uint8Array)) {
      throw new TypeError("Expected Uint8Array");
    }
    if (source.length === 0) {
      return "";
    }
    let zeroes = 0;
    let length2 = 0;
    let pbegin = 0;
    const pend = source.length;
    while (pbegin !== pend && source[pbegin] === 0) {
      pbegin++;
      zeroes++;
    }
    const size = (pend - pbegin) * iFACTOR + 1 >>> 0;
    const b58 = new Uint8Array(size);
    while (pbegin !== pend) {
      let carry = source[pbegin];
      let i = 0;
      for (let it1 = size - 1; (carry !== 0 || i < length2) && it1 !== -1; it1--, i++) {
        carry += 256 * b58[it1] >>> 0;
        b58[it1] = carry % BASE >>> 0;
        carry = carry / BASE >>> 0;
      }
      if (carry !== 0) {
        throw new Error("Non-zero carry");
      }
      length2 = i;
      pbegin++;
    }
    let it2 = size - length2;
    while (it2 !== size && b58[it2] === 0) {
      it2++;
    }
    let str = LEADER.repeat(zeroes);
    for (; it2 < size; ++it2) {
      str += ALPHABET2.charAt(b58[it2]);
    }
    return str;
  }
  function decodeUnsafe(source) {
    if (typeof source !== "string") {
      throw new TypeError("Expected String");
    }
    if (source.length === 0) {
      return new Uint8Array();
    }
    let psz = 0;
    let zeroes = 0;
    let length2 = 0;
    while (source[psz] === LEADER) {
      zeroes++;
      psz++;
    }
    const size = (source.length - psz) * FACTOR + 1 >>> 0;
    const b256 = new Uint8Array(size);
    while (psz < source.length) {
      const charCode = source.charCodeAt(psz);
      if (charCode > 255) {
        return;
      }
      let carry = BASE_MAP[charCode];
      if (carry === 255) {
        return;
      }
      let i = 0;
      for (let it3 = size - 1; (carry !== 0 || i < length2) && it3 !== -1; it3--, i++) {
        carry += BASE * b256[it3] >>> 0;
        b256[it3] = carry % 256 >>> 0;
        carry = carry / 256 >>> 0;
      }
      if (carry !== 0) {
        throw new Error("Non-zero carry");
      }
      length2 = i;
      psz++;
    }
    let it4 = size - length2;
    while (it4 !== size && b256[it4] === 0) {
      it4++;
    }
    const vch = new Uint8Array(zeroes + (size - it4));
    let j = zeroes;
    while (it4 !== size) {
      vch[j++] = b256[it4++];
    }
    return vch;
  }
  function decode2(string2) {
    const buffer = decodeUnsafe(string2);
    if (buffer) {
      return buffer;
    }
    throw new Error("Non-base" + BASE + " character");
  }
  return {
    encode: encode2,
    decodeUnsafe,
    decode: decode2
  };
}
var esm_default = base;

// node_modules/wif/node_modules/bs58/src/esm/index.js
var ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
var esm_default2 = esm_default(ALPHABET);

// node_modules/wif/node_modules/bs58check/src/esm/base.js
function base_default(checksumFn) {
  function encode2(payload) {
    var payloadU8 = Uint8Array.from(payload);
    var checksum = checksumFn(payloadU8);
    var length2 = payloadU8.length + 4;
    var both = new Uint8Array(length2);
    both.set(payloadU8, 0);
    both.set(checksum.subarray(0, 4), payloadU8.length);
    return esm_default2.encode(both);
  }
  function decodeRaw2(buffer) {
    var payload = buffer.slice(0, -4);
    var checksum = buffer.slice(-4);
    var newChecksum = checksumFn(payload);
    if (checksum[0] ^ newChecksum[0] | checksum[1] ^ newChecksum[1] | checksum[2] ^ newChecksum[2] | checksum[3] ^ newChecksum[3])
      return;
    return payload;
  }
  function decodeUnsafe(str) {
    var buffer = esm_default2.decodeUnsafe(str);
    if (buffer == null)
      return;
    return decodeRaw2(buffer);
  }
  function decode2(str) {
    var buffer = esm_default2.decode(str);
    var payload = decodeRaw2(buffer);
    if (payload == null)
      throw new Error("Invalid checksum");
    return payload;
  }
  return {
    encode: encode2,
    decode: decode2,
    decodeUnsafe
  };
}

// node_modules/wif/node_modules/bs58check/src/esm/index.js
function sha256x2(buffer) {
  return sha2562(sha2562(buffer));
}
var esm_default3 = base_default(sha256x2);

// node_modules/wif/src/esm/index.js
function decodeRaw(buffer, version) {
  if (version !== void 0 && buffer[0] !== version)
    throw new Error("Invalid network version");
  if (buffer.length === 33) {
    return {
      version: buffer[0],
      privateKey: buffer.slice(1, 33),
      compressed: false
    };
  }
  if (buffer.length !== 34)
    throw new Error("Invalid WIF length");
  if (buffer[33] !== 1)
    throw new Error("Invalid compression flag");
  return {
    version: buffer[0],
    privateKey: buffer.slice(1, 33),
    compressed: true
  };
}
function encodeRaw(version, privateKey, compressed) {
  if (privateKey.length !== 32)
    throw new TypeError("Invalid privateKey length");
  var result = new Uint8Array(compressed ? 34 : 33);
  var view = new DataView(result.buffer);
  view.setUint8(0, version);
  result.set(privateKey, 1);
  if (compressed) {
    result[33] = 1;
  }
  return result;
}
function decode(str, version) {
  return decodeRaw(esm_default3.decode(str), version);
}
function encode(wif) {
  return esm_default3.encode(encodeRaw(wif.version, wif.privateKey, wif.compressed));
}

export {
  sha2562 as sha256,
  fromUtf8,
  concat,
  fromHex,
  compare,
  writeUInt8,
  writeUInt32,
  readUInt32,
  integer,
  length,
  maxValue,
  minValue,
  regex,
  transform,
  boolean,
  instance,
  number,
  object,
  optional,
  string,
  union,
  parse,
  pipe,
  decode,
  encode
};
//# sourceMappingURL=chunk-QKKLAZRI.js.map
