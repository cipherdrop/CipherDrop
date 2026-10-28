'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toZatoshis, evaluatePayment } = require('../payment');

const base = {
  expectedAmount: '0.01',
  expectedMemo: 'CD-ABC123',
  requiredConfirmations: 3
};

test('amount converts exactly to zatoshis', () => {
  assert.equal(toZatoshis('0.01'), 1_000_000n);
  assert.equal(toZatoshis('0.00000001'), 1n);
  assert.equal(toZatoshis('1.23456789'), 123_456_789n);
});

test('more than 8 decimals is rejected', () => {
  assert.throws(() => toZatoshis('0.000000001'));
});

test('no payment -> pending', () => {
  assert.deepEqual(
    evaluatePayment({ ...base, payments: [] }),
    { status: 'pending', receivedZatoshis: 0n }
  );
});

test('wrong memo -> pending', () => {
  assert.deepEqual(
    evaluatePayment({
      ...base,
      payments: [
        { amount: '0.01', memo: 'CD-WRONG', confirmations: 10 }
      ]
    }),
    { status: 'pending', receivedZatoshis: 0n }
  );
});

test('underpayment -> partial', () => {
  assert.deepEqual(
    evaluatePayment({
      ...base,
      payments: [
        { amount: '0.005', memo: 'CD-ABC123', confirmations: 10 }
      ]
    }),
    { status: 'partial', receivedZatoshis: 500_000n }
  );
});

test('enough amount without enough confirmations -> confirming', () => {
  assert.deepEqual(
    evaluatePayment({
      ...base,
      payments: [
        { amount: '0.01', memo: 'CD-ABC123', confirmations: 2 }
      ]
    }),
    { status: 'confirming', receivedZatoshis: 1_000_000n }
  );
});

test('enough amount with enough confirmations -> paid', () => {
  assert.deepEqual(
    evaluatePayment({
      ...base,
      payments: [
        { amount: '0.01', memo: 'CD-ABC123', confirmations: 3 }
      ]
    }),
    { status: 'paid', receivedZatoshis: 1_000_000n }
  );
});

test('multiple matching payments can satisfy the price', () => {
  assert.deepEqual(
    evaluatePayment({
      ...base,
      payments: [
        { amount: '0.004', memo: 'CD-ABC123', confirmations: 4 },
        { amount: '0.006', memo: 'CD-ABC123', confirmations: 3 }
      ]
    }),
    { status: 'paid', receivedZatoshis: 1_000_000n }
  );
});

test('extra unconfirmed matching payment does not downgrade an already paid invoice', () => {
  assert.deepEqual(
    evaluatePayment({
      ...base,
      payments: [
        { amount: '0.01', memo: 'CD-ABC123', confirmations: 3 },
        { amount: '0.00000001', memo: 'CD-ABC123', confirmations: 0 }
      ]
    }),
    { status: 'paid', receivedZatoshis: 1_000_001n }
  );
});
