'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { server } = require('../server');
const { clearStore } = require('../store');

let baseUrl;

test.before(async () => {
  process.env.ALLOW_SIMULATED_PAYMENTS = '1';

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.beforeEach(() => {
  clearStore();
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test('API health check works', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    ok: true,
    service: 'CipherDrop'
  });
});

test('API create and public GET never expose plaintext or key', async () => {
  const secret = 'API-PRIVATE-SECRET';

  const createdResponse = await fetch(`${baseUrl}/api/drops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      secret,
      amount: '0.01',
      burnAfterUnlock: true
    })
  });

  assert.equal(createdResponse.status, 201);

  const created = await createdResponse.json();

  assert.equal(JSON.stringify(created).includes(secret), false);
  assert.equal(Object.hasOwn(created.drop, 'key'), false);

  const getResponse = await fetch(
    `${baseUrl}/api/drops/${created.drop.id}`
  );

  assert.equal(getResponse.status, 200);

  const publicBody = await getResponse.json();

  assert.equal(JSON.stringify(publicBody).includes(secret), false);
  assert.equal(Object.hasOwn(publicBody.drop, 'key'), false);
});

test('API unlock enforces partial, confirming, paid and burn states', async () => {
  const createResponse = await fetch(`${baseUrl}/api/drops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      secret: 'ONE-TIME-API-SECRET',
      amount: '0.01',
      burnAfterUnlock: true
    })
  });

  const { drop } = await createResponse.json();
  const unlockUrl = `${baseUrl}/api/drops/${drop.id}/unlock`;

  async function unlock(amount, confirmations) {
    const response = await fetch(unlockUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payments: [{
          amount,
          memo: drop.memo,
          confirmations
        }]
      })
    });

    return {
      statusCode: response.status,
      body: await response.json()
    };
  }

  const partial = await unlock('0.005', 10);

  assert.equal(partial.statusCode, 200);
  assert.equal(partial.body.status, 'partial');
  assert.equal(partial.body.unlocked, false);
  assert.equal(partial.body.receivedZatoshis, '500000');
  assert.equal(Object.hasOwn(partial.body, 'key'), false);

  const confirming = await unlock('0.01', 2);

  assert.equal(confirming.statusCode, 200);
  assert.equal(confirming.body.status, 'confirming');
  assert.equal(confirming.body.unlocked, false);
  assert.equal(Object.hasOwn(confirming.body, 'key'), false);

  const paid = await unlock('0.01', 3);

  assert.equal(paid.statusCode, 200);
  assert.equal(paid.body.status, 'paid');
  assert.equal(paid.body.unlocked, true);
  assert.equal(typeof paid.body.key, 'string');
  assert.ok(paid.body.key.length > 0);

  const burned = await unlock('0.01', 3);

  assert.equal(burned.statusCode, 410);
  assert.deepEqual(burned.body, {
    error: 'Drop has already been burned.'
  });
});

test('API rejects client-supplied payments when simulation mode is disabled', async () => {
  const createResponse = await fetch(`${baseUrl}/api/drops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      secret: 'GUARDED-SECRET',
      amount: '0.01',
      burnAfterUnlock: true
    })
  });

  const { drop } = await createResponse.json();

  const previous = process.env.ALLOW_SIMULATED_PAYMENTS;
  delete process.env.ALLOW_SIMULATED_PAYMENTS;

  try {
    const response = await fetch(
      `${baseUrl}/api/drops/${drop.id}/unlock`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payments: [{
            amount: '0.01',
            memo: drop.memo,
            confirmations: 999
          }]
        })
      }
    );

    const body = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      error: 'Payment verification backend is not configured.'
    });
  } finally {
    if (previous === undefined) {
      delete process.env.ALLOW_SIMULATED_PAYMENTS;
    } else {
      process.env.ALLOW_SIMULATED_PAYMENTS = previous;
    }
  }
});
