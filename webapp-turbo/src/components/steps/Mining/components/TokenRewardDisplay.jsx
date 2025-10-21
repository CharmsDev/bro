import React from 'react';
import { calculateRewardInfo, leadingZeros } from '../../../../services/mining/RewardCalculator.js';

export function TokenRewardDisplay({ mining }) {
  // Calculate token reward using exact BRO contract formula
  const calculateTokenReward = () => {
    if (!mining.bestHash || !mining.bestLeadingZeros || mining.bestLeadingZeros === 0) return "0";
    
    try {
      // Verify leading zeros calculation
      const calculatedLeadingZeros = leadingZeros(mining.bestHash);
      
      // Use the exact hash and nonce from mining
      const rewardInfo = calculateRewardInfo(mining.bestNonce || 0, mining.bestHash);
      
      if (mining.bestHash !== window.lastLoggedHash) {
        window.lastLoggedHash = mining.bestHash;
      }
      
      // If there's a mismatch in leading zeros, log it
      if (calculatedLeadingZeros !== mining.bestLeadingZeros) {
        // Mismatch detected
      }
      
      return rewardInfo.formattedAmount;
    } catch (error) {
      return "0";
    }
  };

  // Format hash with leading zeros highlighting
  const formatHashWithLeadingZeros = (hash) => {
    if (!hash || hash === 'Calculating...' || hash === 'Waiting to start...' || hash === 'No best hash yet...' || hash === 'Searching for best hash...') {
      return <span className="hash-remainder">{hash}</span>;
    }

    const leadingZerosCount = mining.bestLeadingZeros || 0;
    const zerosToShow = Math.floor(leadingZerosCount / 4);
    const leadingZerosStr = '0'.repeat(zerosToShow);
    const remainder = hash.slice(zerosToShow);

    return (
      <>
        <span className="leading-zeros text-emerald-400 font-bold">{leadingZerosStr}</span>
        <span className="hash-remainder text-slate-300">{remainder}</span>
      </>
    );
  };

  if (!mining.bestHash || mining.bestLeadingZeros === 0) {
    return null;
  }

  return (
    <div className="bg-emerald-900/20 border border-emerald-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mt-8">
      <h4 className="text-3xl font-bold text-emerald-400 mb-6 text-center flex items-center justify-center gap-2">
        <span></span>
        <span>BRO Token Reward</span>
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Mining Result */}
        <div className="space-y-4">
          <h5 className="text-xl font-semibold text-slate-200 mb-4">Mining Result</h5>
          
          <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Best Hash Found:</div>
            <div className="font-mono text-sm break-all">
              {formatHashWithLeadingZeros(mining.bestHash)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-center">
              <div className="text-slate-400 text-sm mb-1">Leading Zeros:</div>
              <div className="text-emerald-300 text-2xl font-bold">{mining.bestLeadingZeros}</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-center">
              <div className="text-slate-400 text-sm mb-1">Nonce:</div>
              <div className="text-slate-200 text-lg font-mono">{(mining.bestNonce || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Token Reward */}
        <div className="space-y-4">
          <h5 className="text-xl font-semibold text-slate-200 mb-4">Token Reward</h5>
          
          <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-lg p-6 text-center">
            <div className="text-emerald-400 text-sm mb-2">BRO Tokens Earned:</div>
            <div className="text-emerald-300 text-4xl font-bold mb-2">
              {calculateTokenReward()}
            </div>
            <div className="text-slate-400 text-xs">
              Formula: 100M × {mining.bestLeadingZeros}² ÷ 2^h
            </div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-2">Reward Calculation:</div>
            <div className="text-slate-300 text-xs space-y-1">
              <div>• Leading zeros: {mining.bestLeadingZeros} bits</div>
              <div>• Difficulty factor: {mining.bestLeadingZeros}² = {Math.pow(mining.bestLeadingZeros, 2)}</div>
              <div>• Base reward: 100,000,000 sats</div>
              <div>• Halving applied: 2^h (time-based)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
