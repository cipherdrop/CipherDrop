'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDrop } = require('../drop');
const { unlockDrop } = require('../unlock');

function freshDrop() {
  return createDrop({
    secret: 'CipherDrop paid content',
    amount: '0.01',
    burnAfterUnlock: true
  });
}

test('pending payment does not release key', () => {
  const { drop, key } = freshDrop();
  const result = unlockDrop({ drop, key, payments: [] });

  assert.equal(result.unlocked, false);
  assert.equal(result.status, 'pending');
  assert.equal(Object.hasOwn(result, 'key'), false);
});

test('partial payment does not release key', () => {
  const { drop, key } = freshDrop();

  const result = unlockDrop({
    drop,
    key,
    payments: [
      { amount: '0.005', memo: drop.memo, confirmations: 10 }
    ]
  });

  assert.equal(result.unlocked, false);
  assert.equal(result.status, 'partial');
  assert.equal(Object.hasOwn(result, 'key'), false);
});

test('unconfirmed payment does not release key', () => {
  const { drop, key } = freshDrop();

  const result = unlockDrop({
    drop,
    key,
    payments: [
      { amount: '0.01', memo: drop.memo, confirmations: 2 }
    ]
  });

  assert.equal(result.unlocked, false);
  assert.equal(result.status, 'confirming');
  assert.equal(Object.hasOwn(result, 'key'), false);
});

test('confirmed full payment releases key', () => {
  const { drop, key } = freshDrop();

  const result = unlockDrop({
    drop,
    key,
    payments: [
      { amount: '0.01', memo: drop.memo, confirmations: 3 }
    ]
  });

  assert.equal(result.unlocked, true);
  assert.equal(result.status, 'paid');
  assert.equal(result.key, key);
});

test('burn-after-unlock allows only one successful unlock', () => {
  const { drop, key } = freshDrop();

  const payments = [
    { amount: '0.01', memo: drop.memo, confirmations: 3 }
  ];

  const first = unlockDrop({ drop, key, payments });

  assert.equal(first.unlocked, true);
  assert.equal(first.key, key);
  assert.equal(drop.unlocked, true);

  assert.throws(
    () => unlockDrop({ drop, key, payments }),
    /already been burned/
  );
});

test('non-burning drop can be unlocked more than once', () => {
  const { drop, key } = createDrop({
    secret: 'Reusable paid content',
    amount: '0.01',
    burnAfterUnlock: false
  });

  const payments = [
    { amount: '0.01', memo: drop.memo, confirmations: 3 }
  ];

  const first = unlockDrop({ drop, key, payments });
  const second = unlockDrop({ drop, key, payments });

  assert.equal(first.unlocked, true);
  assert.equal(second.unlocked, true);
  assert.equal(first.key, key);
  assert.equal(second.key, key);
  assert.equal(drop.unlocked, false);
});
