import React, { useState } from 'react';
import { formatSatoshis } from '../../../../utils/formatters.js';

export function TransactionDisplay({ generatedTransaction, isGeneratingTx, txError }) {
  const [activeTab, setActiveTab] = useState('summary');

  if (isGeneratingTx) {
    return (
      <div className="bg-blue-900/20 border border-blue-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mb-8">
        <h4 className="text-2xl font-bold text-blue-400 mb-6 text-center flex items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>� Generating Transaction...</span>
        </h4>
        <div className="text-center text-slate-400">
          Creating turbomining transaction with multiple spendable outputs...
        </div>
      </div>
    );
  }

  if (txError) {
    return (
      <div className="bg-red-900/20 border border-red-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mb-8">
        <h4 className="text-2xl font-bold text-red-400 mb-6 text-center flex items-center justify-center gap-2">
          <span></span>
          <span>Transaction Generation Failed</span>
        </h4>
        <div className="text-center text-red-300 mb-4">
          {txError}
        </div>
      </div>
    );
  }

  if (!generatedTransaction) {
    return null;
  }

  const { psbt, signedTxHex, txid, spendableOutputs = [], miningData = {}, totalCost = 0, fee = 0 } = generatedTransaction;
  
  // Use unsigned PSBT hex if available
  const unsignedHex = (psbt && typeof psbt.toHex === 'function') ? psbt.toHex() : null;
  // Prefer signed hex; fallback to unsigned if necessary
  const finalHex = signedTxHex || unsignedHex || '';
  const transactionSize = finalHex ? Math.ceil(finalHex.length / 2) : 0;
  
  // Decode only if we have a valid hex
  let decodedTx = null;
  try {
    if (finalHex) {
      const bitcoin = window.bitcoin;
      decodedTx = bitcoin.Transaction.fromHex(finalHex);
    }
  } catch (_) {
    decodedTx = null;
  }
  
  // Create a transaction-like object for display
  const mockTransaction = decodedTx ? {
    getId: () => txid,
    version: decodedTx.version,
    locktime: decodedTx.locktime,
    ins: decodedTx.ins.map((input) => ({
      hash: input.hash,
      index: input.index,
      sequence: input.sequence,
      witness: input.witness
    })),
    outs: decodedTx.outs.map((output) => ({
      value: output.value,
      script: output.script
    })),
    toHex: () => finalHex
  } : null;

  return (
    <div className="bg-slate-900/60 border border-slate-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mb-8">
      <h4 className="text-2xl font-bold text-slate-200 mb-6 text-center flex items-center justify-center gap-2">
        <span>�</span>
        <span>Generated Turbomining Transaction</span>
      </h4>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-slate-800/50 rounded-lg p-1">
          {['summary', 'json', 'hex'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'summary' && ' Summary'}
              {tab === 'json' && '� JSON'}
              {tab === 'hex' && '� HEX'}
            </button>
          ))}
        </div>
      </div>
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Transaction Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-lg p-4 text-center">
              <div className="text-emerald-400 text-sm mb-1">Spendable Outputs</div>
              <div className="text-emerald-300 text-2xl font-bold">
                {spendableOutputs.length}
              </div>
            </div>
            
            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 text-center">
              <div className="text-blue-400 text-sm mb-1">Total Cost</div>
              <div className="text-blue-300 text-2xl font-bold">
                {formatSatoshis(totalCost)}
              </div>
            </div>
            
            <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4 text-center">
              <div className="text-purple-400 text-sm mb-1">Fee</div>
              <div className="text-purple-300 text-2xl font-bold">
                {formatSatoshis(fee)}
              </div>
            </div>
          </div>

          {/* Mining Data */}
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
            <h5 className="text-slate-300 text-lg font-semibold mb-3">Mining Data (OP_RETURN)</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Nonce:</span>
                <span className="text-slate-300 font-mono">
                  {miningData.nonce ? Number(miningData.nonce).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hash:</span>
                <span className="text-slate-300 font-mono text-xs">{miningData.hash || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Base UTXO:</span>
                <span className="text-slate-300 font-mono text-xs">{miningData.baseUtxoId || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Spendable Outputs */}
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
            <h5 className="text-slate-300 text-lg font-semibold mb-3">Spendable Outputs for Prover</h5>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {spendableOutputs.map((output, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-sm"
                >
                  <div>
                    <div className="text-slate-300 font-mono">
                      Output {output.outputIndex}: {formatSatoshis(output.value)}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {output.hasOpReturn ? ' Has OP_RETURN data' : ' No OP_RETURN data'}
                    </div>
                  </div>
                  <div className="text-slate-400 text-xs">
                    Ready for prover
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'json' && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
          <div className="text-slate-300 text-sm mb-2">Transaction JSON (Decoded from HEX):</div>
          {!mockTransaction ? (
            <div className="text-slate-400 text-xs">No signed transaction available yet.</div>
          ) : (
            <pre className="text-xs text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
              {JSON.stringify({
                txid: mockTransaction.getId(),
                version: mockTransaction.version,
                locktime: mockTransaction.locktime,
                ins: mockTransaction.ins.map((input, i) => {
                  const inputData = {
                    n: i,
                    txid: Buffer.from(input.hash).reverse().toString('hex'),
                    vout: input.index,
                    scriptSig: {
                      asm: '',
                      hex: ''
                    },
                    sequence: input.sequence
                  };
                  if (input.witness && input.witness.length > 0) {
                    inputData.txinwitness = input.witness.map(w => w.toString('hex'));
                  }
                  return inputData;
                }),
                outs: mockTransaction.outs.map((output, i) => {
                  const scriptHex = output.script.toString('hex');
                  const bitcoin = window.bitcoin;
                  let asm = '';
                  try {
                    const decompiled = bitcoin.script.decompile(output.script);
                    if (decompiled) {
                      asm = decompiled.map(op => {
                        if (typeof op === 'number') {
                          return bitcoin.script.toASM([op]);
                        }
                        return op.toString('hex');
                      }).join(' ');
                    }
                  } catch (e) {
                    asm = scriptHex;
                  }
                  return {
                    n: i,
                    value: output.value,
                    scriptPubKey: { 
                      asm: asm, 
                      hex: scriptHex
                    }
                  };
                }),
                size: transactionSize,
                vsize: transactionSize,
                weight: transactionSize * 4
              }, null, 2)}
            </pre>
          )}
        </div>
      )}

      {activeTab === 'hex' && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
          <div className="text-slate-300 text-sm mb-2">Signed Transaction Hex (Ready for Broadcast):</div>
          {!mockTransaction ? (
            <div className="text-slate-400 text-xs">No signed transaction available yet.</div>
          ) : (
            <>
              <div className="bg-slate-900/50 border border-slate-700 rounded p-3">
                <code className="text-xs text-slate-400 font-mono break-all">
                  {mockTransaction.toHex()}
                </code>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Size: {transactionSize} bytes | 
                TXID: {mockTransaction.getId()}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
