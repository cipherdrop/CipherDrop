'use strict';

const { execFile } = require('child_process');

const ZINGO = '/home/yorum/zingolib/target/release/zingo-cli';
const SERVER = 'https://testnet.zec.rocks:443';

function runZingo(command) {
  return new Promise((resolve, reject) => {
    execFile(
      ZINGO,
      [
        '--chain', 'testnet',
        '--server', SERVER,
        '--nosync',
        command
      ],
      {
        timeout: 15000,
        maxBuffer: 1024 * 1024
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `Zingo ${command} failed: ${error.message}\n${stderr || ''}`
            )
          );
          return;
        }

        resolve(stdout);
      }
    );
  });
}

function parseValueTransfers(output) {
  const transfers = [];
  let current = null;

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.startsWith('txid:')) {
      if (current) transfers.push(current);

      current = {
        txid: trimmed.slice(5).trim(),
        memos: []
      };

      continue;
    }

    if (!current) continue;

    if (trimmed.startsWith('status:')) {
      current.status = trimmed.slice(7).trim();
    } else if (trimmed.startsWith('blockheight:')) {
      current.blockheight = Number(trimmed.slice(12).trim());
    } else if (trimmed.startsWith('kind:')) {
      current.kind = trimmed.slice(5).trim();
    } else if (trimmed.startsWith('value:')) {
      current.valueZatoshis = trimmed.slice(6).trim();
    } else if (trimmed.startsWith('recipient_address:')) {
      current.recipientAddress =
        trimmed.slice('recipient_address:'.length).trim();
    } else {
      const memoMatch = trimmed.match(/^memo\s+\d+:\s*(.*)$/i);

      if (memoMatch) {
        current.memos.push(memoMatch[1].trim());
      }
    }
  }

  if (current) transfers.push(current);

  return transfers;
}

function zatoshisToZec(value) {
  const zats = BigInt(value);
  const whole = zats / 100000000n;
  const fraction = (zats % 100000000n)
    .toString()
    .padStart(8, '0')
    .replace(/0+$/, '');

  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

async function getPaymentsForDrop(drop) {
  if (!drop || typeof drop !== 'object') {
    throw new Error('Invalid drop.');
  }

  const output = await runZingo('value_transfers');
  const transfers = parseValueTransfers(output);

  const payments = [];

  for (const tx of transfers) {
    if (!tx.valueZatoshis) continue;

    for (const memo of tx.memos) {
      if (memo !== drop.memo) continue;

      payments.push({
        txid: tx.txid,
        amount: zatoshisToZec(tx.valueZatoshis),
        memo,
        confirmations: tx.status === 'confirmed' ? 999 : 0
      });
    }
  }

  return payments;
}

module.exports = { getPaymentsForDrop };
