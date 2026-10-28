'use strict';

async function getPaymentsForDrop(drop) {
  if (!drop || typeof drop !== 'object') {
    throw new Error('Invalid drop.');
  }

  throw new Error('Payment verification backend is not configured.');
}

module.exports = { getPaymentsForDrop };