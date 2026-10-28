'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createDrop } = require('../drop');
const {
  saveDrop,
  getDrop,
  getKey,
  clearStore
} = require('../store');
const { unlockStoredDrop } = require('../service');

test.beforeEach(() => {
  clearStore();
});

test('failed payment does not delete encryption key', () => {
  const { drop, key } = createDrop({
    secret: 'Still protected',
    amount: '0.01',
    burnAfterUnlock: true
  });

  saveDrop(drop, key);

  const result = unlockStoredDrop({
    id: drop.id,
    payments: [
      { amount: '0.005', memo: drop.memo, confirmations: 10 }
    ]
  });

  assert.equal(result.unlocked, false);
  assert.equal(result.status, 'partial');
  assert.equal(getKey(drop.id), key);
  assert.equal(getDrop(drop.id).unlocked, false);
});

test('successful burn unlock deletes key from vault', () => {
  const { drop, key } = createDrop({
    secret: 'One time secret',
    amount: '0.01',
    burnAfterUnlock: true
  });

  saveDrop(drop, key);

  const result = unlockStoredDrop({
    id: drop.id,
    payments: [
      { amount: '0.01', memo: drop.memo, confirmations: 3 }
    ]
  });

  assert.equal(result.unlocked, true);
  assert.equal(result.key, key);
  assert.equal(getDrop(drop.id).unlocked, true);
  assert.equal(getKey(drop.id), null);
});

test('burned stored drop cannot be unlocked again', () => {
  const { drop, key } = createDrop({
    secret: 'Only once',
    amount: '0.01',
    burnAfterUnlock: true
  });

  saveDrop(drop, key);

  const payments = [
    { amount: '0.01', memo: drop.memo, confirmations: 3 }
  ];

  unlockStoredDrop({
    id: drop.id,
    payments
  });

  assert.throws(
    () => unlockStoredDrop({ id: drop.id, payments }),
    /already been burned/
  );
});

test('non-burning stored drop keeps its key', () => {
  const { drop, key } = createDrop({
    secret: 'Reusable secret',
    amount: '0.01',
    burnAfterUnlock: false
  });

  saveDrop(drop, key);

  const payments = [
    { amount: '0.01', memo: drop.memo, confirmations: 3 }
  ];

  const first = unlockStoredDrop({ id: drop.id, payments });
  const second = unlockStoredDrop({ id: drop.id, payments });

  assert.equal(first.unlocked, true);
  assert.equal(second.unlocked, true);
  assert.equal(getKey(drop.id), key);
});

test('unknown drop is rejected', () => {
  assert.throws(
    () => unlockStoredDrop({
      id: 'does-not-exist',
      payments: []
    }),
    /Drop not found/
  );
});
