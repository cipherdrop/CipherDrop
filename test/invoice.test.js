'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createInvoice, encodeMemo } = require('../invoice');

test('creates a ZIP-321 Testnet invoice', () => {
  const previous = process.env.ZCASH_TESTNET_ADDRESS;

  try {
    process.env.ZCASH_TESTNET_ADDRESS = 'utest1example';

    const invoice = createInvoice({
      network: 'testnet',
      amount: '0.01',
      memo: 'CD-ABC123'
    });

    assert.equal(invoice.network, 'testnet');
    assert.equal(invoice.address, 'utest1example');
    assert.equal(invoice.amount, '0.01');
    assert.equal(invoice.memo, 'CD-ABC123');
    assert.equal(
      invoice.uri,
      `zcash:utest1example?amount=0.01&memo=${encodeMemo('CD-ABC123')}`
    );
  } finally {
    if (previous === undefined) {
      delete process.env.ZCASH_TESTNET_ADDRESS;
    } else {
      process.env.ZCASH_TESTNET_ADDRESS = previous;
    }
  }
});

test('invoice fails closed when receiver address is missing', () => {
  const previous = process.env.ZCASH_MAINNET_ADDRESS;

  try {
    delete process.env.ZCASH_MAINNET_ADDRESS;

    assert.throws(
      () => createInvoice({
        network: 'mainnet',
        amount: '0.01',
        memo: 'CD-ABC123'
      }),
      /ZCASH_MAINNET_ADDRESS is not configured/
    );
  } finally {
    if (previous !== undefined) {
      process.env.ZCASH_MAINNET_ADDRESS = previous;
    }
  }
});
