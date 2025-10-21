import React, { useMemo } from 'react';
import { formatSatoshis } from '../../../../utils/formatters.js';

export function CostSummary({ selectedOutputs, miningTxCost, walletUtxos }) {
  const MINTING_COST_PER_OUTPUT = 5000;
  
  const calculations = useMemo(() => {
    const totalMintingCost = selectedOutputs * MINTING_COST_PER_OUTPUT;
    const grandTotal = miningTxCost + totalMintingCost;
    const availableSats = walletUtxos?.totalValue || 0;
    
    const maxAffordableOutputs = Math.floor(availableSats / MINTING_COST_PER_OUTPUT);
    const outputsCanMint = Math.min(selectedOutputs, maxAffordableOutputs);
    const outputsForFuture = Math.max(0, selectedOutputs - outputsCanMint);
    
    return {
      totalMintingCost,
      grandTotal,
      availableSats,
      outputsCanMint,
      outputsForFuture,
      hasEnoughForAll: availableSats >= totalMintingCost
    };
  }, [selectedOutputs, miningTxCost, walletUtxos]);

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/50 rounded-2xl p-6 mb-6 backdrop-blur-md shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-purple-300 flex items-center gap-2">
          💰 <span>Total Cost - Turbomining</span>
        </h3>
        <div className="text-right">
          <div className="text-xs text-slate-400 mb-1">Selected Outputs</div>
          <div className="text-3xl font-bold text-purple-300">{selectedOutputs}</div>
        </div>
      </div>

      {/* Cost Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Mining Transaction Cost */}
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="text-slate-400 text-sm mb-1">⛏️ Mining Transaction</div>
              <div className="text-slate-300 text-xs">
                {selectedOutputs} outputs + fees
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-300">
                {formatSatoshis(miningTxCost)}
              </div>
            </div>
          </div>
        </div>

        {/* Total Minting Cost */}
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="text-slate-400 text-sm mb-1">🪙 Total Minting Cost</div>
              <div className="text-slate-300 text-xs">
                {selectedOutputs} × {formatSatoshis(MINTING_COST_PER_OUTPUT)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-300">
                {formatSatoshis(calculations.totalMintingCost)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grand Total */}
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-2 border-purple-400/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-purple-300 text-sm font-medium mb-1">💎 GRAND TOTAL</div>
            <div className="text-slate-400 text-xs">Mining + Minting</div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-purple-200">
              {formatSatoshis(calculations.grandTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Balance & Minting Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Available Balance */}
        <div className={`rounded-lg p-3 border ${
          calculations.hasEnoughForAll 
            ? 'bg-emerald-900/20 border-emerald-600/50' 
            : 'bg-yellow-900/20 border-yellow-600/50'
        }`}>
          <div className={`text-xs mb-1 ${
            calculations.hasEnoughForAll ? 'text-emerald-400' : 'text-yellow-400'
          }`}>
            💰 Available in Wallet
          </div>
          <div className={`text-xl font-bold ${
            calculations.hasEnoughForAll ? 'text-emerald-300' : 'text-yellow-300'
          }`}>
            {formatSatoshis(calculations.availableSats)}
          </div>
        </div>

        {/* Can Mint Now */}
        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-3">
          <div className="text-blue-400 text-xs mb-1">✅ Can Mint Now</div>
          <div className="text-xl font-bold text-blue-300">
            {calculations.outputsCanMint} {calculations.outputsCanMint === 1 ? 'output' : 'outputs'}
          </div>
        </div>

        {/* Reserved for Future */}
        {calculations.outputsForFuture > 0 && (
          <div className="bg-purple-900/20 border border-purple-600/50 rounded-lg p-3">
            <div className="text-purple-400 text-xs mb-1">⏳ Reserved for Future</div>
            <div className="text-xl font-bold text-purple-300">
              {calculations.outputsForFuture} {calculations.outputsForFuture === 1 ? 'output' : 'outputs'}
            </div>
          </div>
        )}
      </div>

      {/* Info Message */}
      {!calculations.hasEnoughForAll && (
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
          <div className="text-yellow-300 text-sm flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <strong>Partial Minting:</strong> You can mint {calculations.outputsCanMint} output{calculations.outputsCanMint !== 1 ? 's' : ''} now. 
              The remaining {calculations.outputsForFuture} output{calculations.outputsForFuture !== 1 ? 's' : ''} will be reserved 
              in the mining transaction and can be minted later when you add more funds to your wallet.
            </div>
          </div>
        </div>
      )}

      {calculations.hasEnoughForAll && (
        <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-600/50 rounded-lg">
          <div className="text-emerald-300 text-sm flex items-start gap-2">
            <span className="text-lg">✅</span>
            <div>
              <strong>Full Capacity:</strong> You have enough funds to mint all {selectedOutputs} outputs immediately!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
