import {
  boolean,
  concat,
  decode,
  encode,
  instance,
  integer,
  length,
  maxValue,
  minValue,
  number,
  object,
  optional,
  parse,
  pipe,
  string,
  transform,
  union,
  writeUInt32
} from "./chunk-QKKLAZRI.js";
import "./chunk-2MDE53YM.js";
import {
  __export,
  __publicField
} from "./chunk-2TUXWMP5.js";

// node_modules/ecpair/src/esm/networks.js
var networks_exports = {};
__export(networks_exports, {
  bitcoin: () => bitcoin,
  testnet: () => testnet
});
var bitcoin = {
  messagePrefix: "Bitcoin Signed Message:\n",
  bech32: "bc",
  bip32: {
    public: 76067358,
    private: 76066276
  },
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
};
var testnet = {
  messagePrefix: "Bitcoin Signed Message:\n",
  bech32: "tb",
  bip32: {
    public: 70617039,
    private: 70615956
  },
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};

// node_modules/ecpair/src/esm/types.js
var Uint32Schema = pipe(
  number(),
  integer(),
  minValue(0),
  maxValue(4294967295)
);
var Uint8Schema = pipe(
  number(),
  integer(),
  minValue(0),
  maxValue(255)
);
var NetworkSchema = object({
  messagePrefix: union([string(), instance(Uint8Array)]),
  bech32: string(),
  bip32: object({
    public: Uint32Schema,
    private: Uint32Schema
  }),
  pubKeyHash: Uint8Schema,
  scriptHash: Uint8Schema,
  wif: Uint8Schema
});
var Buffer256Bit = pipe(instance(Uint8Array), length(32));

// node_modules/ecpair/src/esm/testecc.js
var h = (hex) => Buffer.from(hex, "hex");
function testEcc(ecc) {
  assert(
    ecc.isPoint(
      h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
    )
  );
  assert(
    !ecc.isPoint(
      h("030000000000000000000000000000000000000000000000000000000000000005")
    )
  );
  assert(
    ecc.isPrivate(
      h("79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
    )
  );
  assert(
    ecc.isPrivate(
      h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140")
    )
  );
  assert(
    !ecc.isPrivate(
      h("0000000000000000000000000000000000000000000000000000000000000000")
    )
  );
  assert(
    !ecc.isPrivate(
      h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141")
    )
  );
  assert(
    !ecc.isPrivate(
      h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364142")
    )
  );
  assert(
    Buffer.from(
      ecc.privateAdd(
        h("0000000000000000000000000000000000000000000000000000000000000001"),
        h("0000000000000000000000000000000000000000000000000000000000000000")
      )
    ).equals(
      h("0000000000000000000000000000000000000000000000000000000000000001")
    )
  );
  assert(
    ecc.privateAdd(
      h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e"),
      h("0000000000000000000000000000000000000000000000000000000000000003")
    ) === null
  );
  assert(
    Buffer.from(
      ecc.privateAdd(
        h("e211078564db65c3ce7704f08262b1f38f1ef412ad15b5ac2d76657a63b2c500"),
        h("b51fbb69051255d1becbd683de5848242a89c229348dd72896a87ada94ae8665")
      )
    ).equals(
      h("9730c2ee69edbb958d42db7460bafa18fef9d955325aec99044c81c8282b0a24")
    )
  );
  assert(
    Buffer.from(
      ecc.privateNegate(
        h("0000000000000000000000000000000000000000000000000000000000000001")
      )
    ).equals(
      h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140")
    )
  );
  assert(
    Buffer.from(
      ecc.privateNegate(
        h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e")
      )
    ).equals(
      h("0000000000000000000000000000000000000000000000000000000000000003")
    )
  );
  assert(
    Buffer.from(
      ecc.privateNegate(
        h("b1121e4088a66a28f5b6b0f5844943ecd9f610196d7bb83b25214b60452c09af")
      )
    ).equals(
      h("4eede1bf775995d70a494f0a7bb6bc11e0b8cccd41cce8009ab1132c8b0a3792")
    )
  );
  assert(
    Buffer.from(
      ecc.pointCompress(
        h(
          "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
        ),
        true
      )
    ).equals(
      h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
    )
  );
  assert(
    Buffer.from(
      ecc.pointCompress(
        h(
          "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
        ),
        false
      )
    ).equals(
      h(
        "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
      )
    )
  );
  assert(
    Buffer.from(
      ecc.pointCompress(
        h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
        true
      )
    ).equals(
      h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
    )
  );
  assert(
    Buffer.from(
      ecc.pointCompress(
        h("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
        false
      )
    ).equals(
      h(
        "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
      )
    )
  );
  assert(
    Buffer.from(
      ecc.pointFromScalar(
        h("b1121e4088a66a28f5b6b0f5844943ecd9f610196d7bb83b25214b60452c09af")
      )
    ).equals(
      h("02b07ba9dca9523b7ef4bd97703d43d20399eb698e194704791a25ce77a400df99")
    )
  );
  assert(
    ecc.xOnlyPointAddTweak(
      h("79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
      h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140")
    ) === null
  );
  let xOnlyRes = ecc.xOnlyPointAddTweak(
    h("1617d38ed8d8657da4d4761e8057bc396ea9e4b9d29776d4be096016dbd2509b"),
    h("a8397a935f0dfceba6ba9618f6451ef4d80637abf4e6af2669fbc9de6a8fd2ac")
  );
  assert(
    Buffer.from(xOnlyRes.xOnlyPubkey).equals(
      h("e478f99dab91052ab39a33ea35fd5e6e4933f4d28023cd597c9a1f6760346adf")
    ) && xOnlyRes.parity === 1
  );
  xOnlyRes = ecc.xOnlyPointAddTweak(
    h("2c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991"),
    h("823c3cd2142744b075a87eade7e1b8678ba308d566226a0056ca2b7a76f86b47")
  );
  assert(
    Buffer.from(xOnlyRes.xOnlyPubkey).equals(
      h("9534f8dc8c6deda2dc007655981c78b49c5d96c778fbf363462a11ec9dfd948c")
    ) && xOnlyRes.parity === 0
  );
  assert(
    Buffer.from(
      ecc.sign(
        h("5e9f0a0d593efdcf78ac923bc3313e4e7d408d574354ee2b3288c0da9fbba6ed"),
        h("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140")
      )
    ).equals(
      h(
        "54c4a33c6423d689378f160a7ff8b61330444abb58fb470f96ea16d99d4a2fed07082304410efa6b2943111b6a4e0aaa7b7db55a07e9861d1fb3cb1f421044a5"
      )
    )
  );
  assert(
    ecc.verify(
      h("5e9f0a0d593efdcf78ac923bc3313e4e7d408d574354ee2b3288c0da9fbba6ed"),
      h("0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
      h(
        "54c4a33c6423d689378f160a7ff8b61330444abb58fb470f96ea16d99d4a2fed07082304410efa6b2943111b6a4e0aaa7b7db55a07e9861d1fb3cb1f421044a5"
      )
    )
  );
  if (ecc.signSchnorr) {
    assert(
      Buffer.from(
        ecc.signSchnorr(
          h("7e2d58d8b3bcdf1abadec7829054f90dda9805aab56c77333024b9d0a508b75c"),
          h("c90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b14e5c9"),
          h("c87aa53824b4d7ae2eb035a2b5bbbccc080e76cdc6d1692c4b0b62d798e6d906")
        )
      ).equals(
        h(
          "5831aaeed7b44bb74e5eab94ba9d4294c49bcf2a60728d8b4c200f50dd313c1bab745879a5ad954a72c45a91c3a51d3c7adea98d82f8481e0e1e03674a6f3fb7"
        )
      )
    );
  }
  if (ecc.verifySchnorr) {
    assert(
      ecc.verifySchnorr(
        h("7e2d58d8b3bcdf1abadec7829054f90dda9805aab56c77333024b9d0a508b75c"),
        h("dd308afec5777e13121fa72b9cc1b7cc0139715309b086c960e18fd969774eb8"),
        h(
          "5831aaeed7b44bb74e5eab94ba9d4294c49bcf2a60728d8b4c200f50dd313c1bab745879a5ad954a72c45a91c3a51d3c7adea98d82f8481e0e1e03674a6f3fb7"
        )
      )
    );
  }
}
function assert(bool) {
  if (!bool) throw new Error("ecc library invalid");
}

// node_modules/ecpair/src/esm/ecpair.js
var ECPairOptionsSchema = optional(
  object({
    compressed: optional(boolean()),
    network: optional(NetworkSchema),
    // https://github.com/fabian-hiller/valibot/issues/243#issuecomment-2182514063
    rng: optional(
      pipe(
        instance(Function),
        transform((func) => {
          return (arg) => {
            const parsedArg = parse(optional(number()), arg);
            const returnedValue = func(parsedArg);
            const parsedReturn = parse(instance(Uint8Array), returnedValue);
            return parsedReturn;
          };
        })
      )
    )
  })
);
var toXOnly = (pubKey) => pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33);
function ECPairFactory(ecc) {
  testEcc(ecc);
  function isPoint(maybePoint) {
    return ecc.isPoint(maybePoint);
  }
  function fromPrivateKey(buffer, options) {
    parse(Buffer256Bit, buffer);
    if (!ecc.isPrivate(buffer))
      throw new TypeError("Private key not in range [1, n)");
    parse(ECPairOptionsSchema, options);
    return new ECPair(buffer, void 0, options);
  }
  function fromPublicKey(buffer, options) {
    if (!ecc.isPoint(buffer)) {
      throw new Error("Point not on the curve");
    }
    parse(ECPairOptionsSchema, options);
    return new ECPair(void 0, buffer, options);
  }
  function fromWIF(wifString, network) {
    const decoded = decode(wifString);
    const version = decoded.version;
    if (Array.isArray(network)) {
      network = network.filter((x) => {
        return version === x.wif;
      }).pop();
      if (!network) throw new Error("Unknown network version");
    } else {
      network = network || bitcoin;
      if (version !== network.wif) throw new Error("Invalid network version");
    }
    return fromPrivateKey(decoded.privateKey, {
      compressed: decoded.compressed,
      network
    });
  }
  function makeRandom(options) {
    parse(ECPairOptionsSchema, options);
    if (options === void 0) options = {};
    const rng = options.rng || ((size) => crypto.getRandomValues(new Uint8Array(size)));
    let d;
    do {
      d = rng(32);
      parse(Buffer256Bit, d);
    } while (!ecc.isPrivate(d));
    return fromPrivateKey(d, options);
  }
  class ECPair {
    constructor(__D, __Q, options) {
      __publicField(this, "__D");
      __publicField(this, "__Q");
      __publicField(this, "compressed");
      __publicField(this, "network");
      __publicField(this, "lowR");
      this.__D = __D;
      this.__Q = __Q;
      this.lowR = false;
      if (options === void 0) options = {};
      this.compressed = options.compressed === void 0 ? true : options.compressed;
      this.network = options.network || bitcoin;
      if (__Q !== void 0) this.__Q = ecc.pointCompress(__Q, this.compressed);
    }
    get privateKey() {
      return this.__D;
    }
    get publicKey() {
      if (!this.__Q) {
        const p = ecc.pointFromScalar(this.__D, this.compressed);
        this.__Q = p;
      }
      return this.__Q;
    }
    toWIF() {
      if (!this.__D) throw new Error("Missing private key");
      return encode({
        compressed: this.compressed,
        privateKey: this.__D,
        version: this.network.wif
      });
    }
    tweak(t) {
      if (this.privateKey) return this.tweakFromPrivateKey(t);
      return this.tweakFromPublicKey(t);
    }
    sign(hash, lowR) {
      if (!this.__D) throw new Error("Missing private key");
      if (lowR === void 0) lowR = this.lowR;
      if (lowR === false) {
        return ecc.sign(hash, this.__D);
      } else {
        let sig = ecc.sign(hash, this.__D);
        const extraData = new Uint8Array(32);
        let counter = 0;
        while (sig[0] > 127) {
          counter++;
          writeUInt32(extraData, 0, counter, "LE");
          sig = ecc.sign(hash, this.__D, extraData);
        }
        return sig;
      }
    }
    signSchnorr(hash) {
      if (!this.privateKey) throw new Error("Missing private key");
      if (!ecc.signSchnorr)
        throw new Error("signSchnorr not supported by ecc library");
      return ecc.signSchnorr(hash, this.privateKey);
    }
    verify(hash, signature) {
      return ecc.verify(hash, this.publicKey, signature);
    }
    verifySchnorr(hash, signature) {
      if (!ecc.verifySchnorr)
        throw new Error("verifySchnorr not supported by ecc library");
      return ecc.verifySchnorr(hash, this.publicKey.subarray(1, 33), signature);
    }
    tweakFromPublicKey(t) {
      const xOnlyPubKey = toXOnly(this.publicKey);
      const tweakedPublicKey = ecc.xOnlyPointAddTweak(xOnlyPubKey, t);
      if (!tweakedPublicKey || tweakedPublicKey.xOnlyPubkey === null)
        throw new Error("Cannot tweak public key!");
      const parityByte = Uint8Array.from([
        tweakedPublicKey.parity === 0 ? 2 : 3
      ]);
      return fromPublicKey(
        concat([parityByte, tweakedPublicKey.xOnlyPubkey]),
        {
          network: this.network,
          compressed: this.compressed
        }
      );
    }
    tweakFromPrivateKey(t) {
      const hasOddY = this.publicKey[0] === 3 || this.publicKey[0] === 4 && (this.publicKey[64] & 1) === 1;
      const privateKey = hasOddY ? ecc.privateNegate(this.privateKey) : this.privateKey;
      const tweakedPrivateKey = ecc.privateAdd(privateKey, t);
      if (!tweakedPrivateKey) throw new Error("Invalid tweaked private key!");
      return fromPrivateKey(tweakedPrivateKey, {
        network: this.network,
        compressed: this.compressed
      });
    }
  }
  return {
    isPoint,
    fromPrivateKey,
    fromPublicKey,
    fromWIF,
    makeRandom
  };
}
export {
  ECPairFactory,
  ECPairFactory as default,
  networks_exports as networks
};
//# sourceMappingURL=ecpair.js.map
