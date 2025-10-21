// Step definitions for BRO Token minting process
export const STEPS = {
  WALLET_SETUP: 1,
  BATCH_CONFIG: 2,
  MINING: 3,
  AUTO_MINTING: 4
};

export const STEP_NAMES = {
  [STEPS.WALLET_SETUP]: 'Wallet Setup',
  [STEPS.BATCH_CONFIG]: 'Batch Configuration', 
  [STEPS.MINING]: 'Mining Process',
  [STEPS.AUTO_MINTING]: 'Auto Minting'
};

export const STEP_DESCRIPTIONS = {
  [STEPS.WALLET_SETUP]: 'Create or import your Bitcoin wallet',
  [STEPS.BATCH_CONFIG]: 'Configure batch size and verify funds',
  [STEPS.MINING]: 'Mine for proof-of-work hash',
  [STEPS.AUTO_MINTING]: 'Automatic minting process'
};
