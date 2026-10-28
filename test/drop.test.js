'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDrop } = require('../drop');
const { decrypt } = require('../crypto');

test('drop stores ciphertext but not plaintext or encryption key', () => {
  const secret = 'Dokumen rahasia CipherDrop';
  const { drop, key } = createDrop({
    secret,
    amount: '0.01'
  });

  assert.equal(Object.hasOwn(drop, 'secret'), false);
  assert.equal(Object.hasOwn(drop, 'key'), false);
  assert.notEqual(drop.ciphertext, secret);
  assert.equal(decrypt(drop, key), secret);
});

test('each drop gets unique id, memo and encryption key', () => {
  const a = createDrop({ secret: 'A', amount: '0.01' });
  const b = createDrop({ secret: 'B', amount: '0.01' });

  assert.notEqual(a.drop.id, b.drop.id);
  assert.notEqual(a.drop.memo, b.drop.memo);
  assert.notEqual(a.key, b.key);
});

test('empty secret is rejected', () => {
  assert.throws(() =>
    createDrop({ secret: '   ', amount: '0.01' })
  );
});

test('invalid amount is rejected', () => {
  assert.throws(() =>
    createDrop({ secret: 'secret', amount: '0.000000001' })
  );
});
