'use strict';

const { evaluatePayment } = require('./payment');

function unlockDrop({ drop, key, payments, requiredConfirmations = 3 }) {
  if (!drop || typeof drop !== 'object') {
    throw new Error('Invalid drop.');
  }

  if (drop.unlocked && drop.burnAfterUnlock) {
    throw new Error('Drop has already been burned.');
  }

  const payment = evaluatePayment({
    expectedAmount: drop.amount,
    expectedMemo: drop.memo,
    payments,
    requiredConfirmations
  });

  if (payment.status !== 'paid') {
    return {
      unlocked: false,
      status: payment.status,
      receivedZatoshis: payment.receivedZatoshis
    };
  }

  if (drop.burnAfterUnlock) {
    drop.unlocked = true;
  }

  return {
    unlocked: true,
    status: 'paid',
    receivedZatoshis: payment.receivedZatoshis,
    key
  };
}

module.exports = { unlockDrop };
