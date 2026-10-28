'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { encrypt, decrypt } = require('../crypto');

test('encrypt then decrypt restores the original secret', () => {
  const original = 'Rahasia CipherDrop';
  const encrypted = encrypt(original);

  assert.notEqual(encrypted.ciphertext, original);
  assert.equal(decrypt(encrypted, encrypted.key), original);
});

test('wrong key cannot decrypt the secret', () => {
  const encrypted = encrypt('super secret');
  const wrongKey = Buffer.alloc(32).toString('base64url');

  assert.throws(() => decrypt(encrypted, wrongKey));
});

test('modified ciphertext fails authentication', () => {
  const encrypted = encrypt('do not modify me');
  const bytes = Buffer.from(encrypted.ciphertext, 'base64');

  bytes[0] ^= 1;

  assert.throws(() =>
    decrypt(
      { ...encrypted, ciphertext: bytes.toString('base64') },
      encrypted.key
    )
  );
});
