'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createDrop } = require('./drop');
const { saveDrop, getDrop } = require('./store');
const { unlockStoredDrop } = require('./service');
const { createInvoice } = require('./invoice');
const QRCode = require('qrcode');
const { getPaymentsForDrop } = require('./verifier');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 64 * 1024;
const PUBLIC_DIR = path.join(__dirname, 'public');

function sendHtml(res, filename) {
  fs.readFile(path.join(PUBLIC_DIR, filename), (error, data) => {
    if (error) {
      sendJson(res, 500, { error: 'Unable to load page.' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  res.end(JSON.stringify(body, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'));
        req.destroy();
        return;
      }

      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON.'));
      }
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    sendHtml(res, 'index.html');
    return;
  }

  if (
    req.method === 'GET' &&
    /^\/drop\/[a-f0-9]{32}$/.test(req.url)
  ) {
    sendHtml(res, 'drop.html');
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'CipherDrop'
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/drops/')) {
    const id = req.url.slice('/api/drops/'.length);

    if (!/^[a-f0-9]{32}$/.test(id)) {
      sendJson(res, 404, {
        error: 'Drop not found.'
      });
      return;
    }

    const drop = getDrop(id);

    if (!drop) {
      sendJson(res, 404, {
        error: 'Drop not found.'
      });
      return;
    }

    try {
      const invoice = createInvoice(drop);
      const qrDataUrl = await QRCode.toDataURL(invoice.uri, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320
      });

      sendJson(res, 200, {
        drop,
        invoice: {
          ...invoice,
          qrDataUrl
        }
      });
    } catch (error) {
      sendJson(res, 503, {
        error: error.message
      });
    }
    return;
  }

  const unlockMatch = req.url.match(
    /^\/api\/drops\/([a-f0-9]{32})\/unlock$/
  );

  if (req.method === 'POST' && unlockMatch) {
    try {
      const id = unlockMatch[1];
      const drop = getDrop(id);

      if (!drop) {
        sendJson(res, 404, {
          error: 'Drop not found.'
        });
        return;
      }

      let payments;

      if (process.env.ALLOW_SIMULATED_PAYMENTS === '1') {
        const body = await readJson(req);
        payments = body.payments;
      } else {
        payments = await getPaymentsForDrop(drop);
      }

      const result = unlockStoredDrop({
        id,
        payments,
        requiredConfirmations: 3
      });

      sendJson(res, 200, result);
    } catch (error) {
      const status =
        error.message === 'Drop not found.' ? 404 :
        error.message === 'Drop has already been burned.' ? 410 :
        error.message === 'Payment verification backend is not configured.' ? 503 :
        400;

      sendJson(res, status, {
        error: error.message
      });
    }

    return;
  }

  if (req.method === 'POST' && req.url === '/api/drops') {
    try {
      const body = await readJson(req);

      const { drop, key } = createDrop({
        secret: body.secret,
        amount: body.amount,
        burnAfterUnlock: body.burnAfterUnlock !== false
      });

      const publicDrop = saveDrop(drop, key);

      sendJson(res, 201, {
        drop: publicDrop
      });
    } catch (error) {
      sendJson(res, 400, {
        error: error.message
      });
    }

    return;
  }

  sendJson(res, 404, {
    error: 'Not found.'
  });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`CipherDrop listening on http://${HOST}:${PORT}`);
  });
}

module.exports = { server };
