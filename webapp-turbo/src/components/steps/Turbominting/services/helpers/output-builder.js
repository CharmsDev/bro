/**
 * Output Builder Helper
 * Constructs transaction outputs from funding analysis
 */

const MINTING_OUTPUT_VALUE = 5000; // Minimum for prover fees
const MIN_CHANGE_VALUE = 5000; // Minimum change to create separate output

/**
 * Build outputs for partial funding scenario
 */
export function buildPartialFundingOutputs(analysis) {
  const outputs = [];
  const outputValue = analysis.outputValue || MINTING_OUTPUT_VALUE;
  
  // Add minting outputs
  for (let i = 0; i < analysis.outputCount; i++) {
    outputs.push({
      value: outputValue,
      type: 'minting'
    });
  }
  
  // Add change output if exists and is large enough
  if (analysis.mathematics?.totalChange > 0) {
    const changeValue = analysis.mathematics.totalChange;
    
    // If change is less than minimum, merge with last minting output
    if (changeValue < MIN_CHANGE_VALUE && outputs.length > 0) {
      outputs[outputs.length - 1].value += changeValue;
    } else {
      outputs.push({
        value: changeValue,
        type: 'change'
      });
    }
  }
  
  return outputs;
}

/**
 * Build outputs for split scenario
 */
export function buildSplitOutputs(splitDetails) {
  const outputs = [];
  
  splitDetails.forEach(detail => {
    // Add minting outputs
    for (let i = 0; i < detail.willCreate; i++) {
      outputs.push({
        value: MINTING_OUTPUT_VALUE,
        type: 'minting'
      });
    }
    
    // Add change output if exists
    if (detail.mathematics.change > 0) {
      outputs.push({
        value: detail.mathematics.change,
        type: 'change'
      });
    }
  });
  
  return outputs;
}

/**
 * Build outputs for combine scenario
 */
export function buildCombineOutputs(combineDetails, mathematics) {
  const outputs = [];
  
  // Add minting outputs
  for (let i = 0; i < combineDetails.willCreateOutputs; i++) {
    outputs.push({
      value: MINTING_OUTPUT_VALUE,
      type: 'minting'
    });
  }
  
  // Add change output if exists
  if (mathematics?.totalChange > 0) {
    outputs.push({
      value: mathematics.totalChange,
      type: 'change'
    });
  }
  
  return outputs;
}

/**
 * Main function to build outputs from analysis
 * Simplified: All funding transactions follow the same pattern
 */
export function buildOutputsFromAnalysis(analysis) {
  const outputs = [];
  
  // If we have outputCount, use it (works for all cases)
  if (analysis.outputCount) {
    const outputValue = analysis.outputValue || MINTING_OUTPUT_VALUE;
    
    // Add minting outputs
    for (let i = 0; i < analysis.outputCount; i++) {
      outputs.push({
        value: outputValue,
        type: 'minting'
      });
    }
    
    // Add change output if exists and is large enough
    if (analysis.mathematics?.totalChange > 0) {
      const changeValue = analysis.mathematics.totalChange;
      
      // If change is less than minimum, merge with last minting output
      if (changeValue < MIN_CHANGE_VALUE && outputs.length > 0) {
        outputs[outputs.length - 1].value += changeValue;
      } else {
        outputs.push({
          value: changeValue,
          type: 'change'
        });
      }
    }
    
    return outputs;
  }
  
  // Legacy support for old analysis format
  if (analysis.isPartial && analysis.outputCount) {
    return buildPartialFundingOutputs(analysis);
  }
  
  if (analysis.splitDetails) {
    return buildSplitOutputs(analysis.splitDetails);
  }
  
  if (analysis.combineDetails) {
    return buildCombineOutputs(analysis.combineDetails, analysis.mathematics);
  }
  
  return [];
}
