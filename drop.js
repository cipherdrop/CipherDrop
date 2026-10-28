'use strict';

const crypto = require('crypto');
const { encrypt } = require('./crypto');
const { toZatoshis } = require('./payment');
const { getNetwork } = require('./config');

function createDrop({ secret, amount, burnAfterUnlock = true }) {
  const network = getNetwork();
  if (typeof secret !== 'string' || !secret.trim()) {
    throw new Error('Secret is required.');
  }

  // Validate amount without storing floating-point money.
  toZatoshis(amount);

  const id = crypto.randomBytes(16).toString('hex');
  const memo = `CD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const encrypted = encrypt(secret);

  return {
    drop: {
      id,
      network: network.name,
      memo,
      amount: String(amount),
      burnAfterUnlock: Boolean(burnAfterUnlock),
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      tag: encrypted.tag,
      unlocked: false,
      createdAt: new Date().toISOString()
    },

    // Keep this separate from the stored encrypted payload.
    key: encrypted.key
  };
}

module.exports = { createDrop };
