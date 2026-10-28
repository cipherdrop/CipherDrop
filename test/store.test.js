'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDrop } = require('../drop');
const {
  saveDrop,
  getDrop,
  getKey,
  deleteKey,
  clearStore
} = require('../store');

test.beforeEach(() => {
  clearStore();
});

test('stored public drop does not expose encryption key', () => {
  const { drop, key } = createDrop({
    secret: 'Private CipherDrop payload',
    amount: '0.01'
  });

  saveDrop(drop, key);

  const publicDrop = getDrop(drop.id);

  assert.equal(Object.hasOwn(publicDrop, 'key'), false);
  assert.equal(Object.hasOwn(publicDrop, 'secret'), false);
  assert.equal(JSON.stringify(publicDrop).includes(key), false);
});

test('server-side vault can retrieve encryption key', () => {
  const { drop, key } = createDrop({
    secret: 'Vault test',
    amount: '0.01'
  });

  saveDrop(drop, key);

  assert.equal(getKey(drop.id), key);
});

test('deleting key destroys access to it', () => {
  const { drop, key } = createDrop({
    secret: 'Burn me',
    amount: '0.01'
  });

  saveDrop(drop, key);

  assert.equal(getKey(drop.id), key);
  assert.equal(deleteKey(drop.id), true);
  assert.equal(getKey(drop.id), null);
});

test('duplicate drop id is rejected', () => {
  const { drop, key } = createDrop({
    secret: 'No duplicates',
    amount: '0.01'
  });

  saveDrop(drop, key);

  assert.throws(
    () => saveDrop(drop, key),
    /already exists/
  );
});
