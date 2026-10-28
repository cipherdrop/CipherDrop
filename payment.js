'use strict';

const ZATOSHI_PER_ZEC = 100_000_000n;

function toZatoshis(value) {
  const s = String(value).trim();

  if (!/^\d+(\.\d{1,8})?$/.test(s)) {
    throw new Error('Invalid Zcash amount.');
  }

  const [whole, fraction = ''] = s.split('.');
  const padded = fraction.padEnd(8, '0');

  const amount =
    BigInt(whole) * ZATOSHI_PER_ZEC +
    BigInt(padded || '0');

  if (amount <= 0n) {
    throw new Error('Invalid Zcash amount.');
  }

  return amount;
}

function evaluatePayment({
  expectedAmount,
  expectedMemo,
  payments,
  requiredConfirmations = 3
}) {
  const expected = toZatoshis(expectedAmount);

  if (typeof expectedMemo !== 'string' || !expectedMemo.trim()) {
    throw new Error('Invalid expected memo.');
  }

  const matches = [];

  for (const p of Array.isArray(payments) ? payments : []) {
    if (!p || p.memo !== expectedMemo) continue;

    try {
      matches.push({
        amount: toZatoshis(p.amount),
        confirmations: p.confirmations
      });
    } catch {
      continue;
    }
  }

  const received = matches.reduce((sum, p) => sum + p.amount, 0n);

  if (received === 0n) {
    return { status: 'pending', receivedZatoshis: 0n };
  }

  if (received < expected) {
    return { status: 'partial', receivedZatoshis: received };
  }

  const confirmedReceived = matches
    .filter(
      (p) =>
        Number.isInteger(p.confirmations) &&
        p.confirmations >= requiredConfirmations
    )
    .reduce((sum, p) => sum + p.amount, 0n);

  return {
    status: confirmedReceived >= expected ? 'paid' : 'confirming',
    receivedZatoshis: received
  };
}

module.exports = { toZatoshis, evaluatePayment };
