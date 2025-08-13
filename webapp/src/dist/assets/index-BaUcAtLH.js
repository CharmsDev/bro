import { p as i } from "./index-JAkBZLNc.js";
import { s as t } from "./sha2-DoG4QkU_.js";
/*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) */
function e(n) {
  if (typeof n != "string") throw new TypeError("invalid mnemonic type: " + typeof n);
  return n.normalize("NFKD");
}
function m(n) {
  const o = e(n), r = o.split(" ");
  if (![12, 15, 18, 21, 24].includes(r.length)) throw new Error("Invalid mnemonic");
  return { nfkd: o, words: r };
}
const c = (n) => e("mnemonic" + n);
function s(n, o = "") {
  return i(t, m(n).nfkd, c(o), { c: 2048, dkLen: 64 });
}
export {
  s as mnemonicToSeed
};
