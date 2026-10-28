'use strict';

const { unlockDrop } = require('./unlock');
const {
  getDrop,
  getKey,
  deleteKey,
  updateDrop
} = require('./store');

function unlockStoredDrop({
  id,
  payments,
  requiredConfirmations = 3
}) {
  const drop = getDrop(id);

  if (!drop) {
    throw new Error('Drop not found.');
  }

  const key = getKey(id);

  if (!key) {
    if (drop.burnAfterUnlock && drop.unlocked) {
      throw new Error('Drop has already been burned.');
    }

    throw new Error('Encryption key unavailable.');
  }

  const result = unlockDrop({
    drop,
    key,
    payments,
    requiredConfirmations
  });

  if (!result.unlocked) {
    return result;
  }

  if (drop.burnAfterUnlock) {
    updateDrop(drop);
    deleteKey(id);
  }

  return result;
}

module.exports = { unlockStoredDrop };
