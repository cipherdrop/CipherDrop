'use strict';

const { toZatoshis } = require('./payment');

function getReceiverAddress(network) {
  const variable =
    network === 'mainnet'
      ? 'ZCASH_MAINNET_ADDRESS'
      : network === 'testnet'
        ? 'ZCASH_TESTNET_ADDRESS'
        : null;

  if (!variable) {
    throw new Error('Unsupported Zcash network.');
  }

  const address = process.env[variable];

  if (!address) {
    throw new Error(`${variable} is not configured.`);
  }

  return address;
}

function encodeMemo(memo) {
  return Buffer.from(memo, 'utf8').toString('base64url');
}

function createInvoice(drop) {
  if (!drop || typeof drop !== 'object') {
    throw new Error('Invalid drop.');
  }

  toZatoshis(drop.amount);

  const address = getReceiverAddress(drop.network);
  const memo = encodeMemo(drop.memo);

  return {
    network: drop.network,
    address,
    amount: drop.amount,
    memo: drop.memo,
    uri: `zcash:${address}?amount=${drop.amount}&memo=${memo}`
  };
}

module.exports = {
  getReceiverAddress,
  encodeMemo,
  createInvoice
};
