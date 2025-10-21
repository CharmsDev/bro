// Common formatting utilities

/**
 * Format satoshis with thousand separators and 'sats' suffix
 * @param {number} sats - Amount in satoshis
 * @returns {string} Formatted string like "1,000 sats"
 */
export const formatSatoshis = (sats) => {
  if (typeof sats !== 'number' || isNaN(sats)) return '0 sats';
  return sats.toLocaleString() + ' sats';
};

/**
 * Format hash rate with appropriate units
 * @param {number} hashRate - Hash rate per second
 * @returns {string} Formatted string like "1.5 MH/s"
 */
export const formatHashRate = (hashRate) => {
  if (!hashRate || hashRate === 0) return '0 H/s';
  
  if (hashRate >= 1000000000) {
    return `${(hashRate / 1000000000).toFixed(2)} GH/s`;
  } else if (hashRate >= 1000000) {
    return `${(hashRate / 1000000).toFixed(2)} MH/s`;
  } else if (hashRate >= 1000) {
    return `${(hashRate / 1000).toFixed(2)} KH/s`;
  } else {
    return `${hashRate.toFixed(0)} H/s`;
  }
};

/**
 * Format nonce with thousand separators
 * @param {number|BigInt} nonce - Nonce value
 * @returns {string} Formatted string like "1,234,567"
 */
export const formatNonce = (nonce) => {
  if (typeof nonce === 'bigint') {
    return nonce.toLocaleString();
  }
  if (typeof nonce === 'number') {
    return nonce.toLocaleString();
  }
  return '0';
};

/**
 * Format hash with leading zeros highlighted
 * @param {string} hash - Hash string
 * @param {number} leadingZeros - Number of leading zero bits
 * @returns {object} Object with leadingZerosStr and remainder
 */
export const formatHashWithLeadingZeros = (hash, leadingZeros = 0) => {
  if (!hash || hash === 'Calculating...' || hash === 'Waiting to start...' || 
      hash === 'No best hash yet...' || hash === 'Searching for best hash...') {
    return { leadingZerosStr: '', remainder: hash };
  }

  const zerosToShow = Math.floor(leadingZeros / 4);
  const leadingZerosStr = '0'.repeat(zerosToShow);
  const remainder = hash.slice(zerosToShow);

  return { leadingZerosStr, remainder };
};

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string like "1.5 KB"
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format timestamp to readable date
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleString();
};
