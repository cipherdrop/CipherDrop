
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getPaymentsForDrop } = require('../verifier');

test('real payment verifier fails closed when backend is not configured', async () => {
  await assert.rejects(
    () => getPaymentsForDrop({
      id: 'abc',
      amount: '0.01',
      memo: 'CD-TEST'
    }),
    /Payment verification backend is not configured/
  );
});