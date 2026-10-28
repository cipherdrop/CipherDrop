'use strict';

const drops = new Map();
const keys = new Map();

function saveDrop(drop, key) {
  if (!drop || typeof drop.id !== 'string' || !drop.id) {
    throw new Error('Invalid drop.');
  }

  if (typeof key !== 'string' || !key) {
    throw new Error('Invalid encryption key.');
  }

  if (drops.has(drop.id) || keys.has(drop.id)) {
    throw new Error('Drop already exists.');
  }

  drops.set(drop.id, structuredClone(drop));
  keys.set(drop.id, key);

  return structuredClone(drop);
}

function getDrop(id) {
  const drop = drops.get(id);
  return drop ? structuredClone(drop) : null;
}

function getKey(id) {
  return keys.get(id) || null;
}

function deleteKey(id) {
  return keys.delete(id);
}

function updateDrop(drop) {
  if (!drop || typeof drop.id !== 'string' || !drops.has(drop.id)) {
    throw new Error('Drop not found.');
  }

  drops.set(drop.id, structuredClone(drop));
  return structuredClone(drop);
}

function clearStore() {
  drops.clear();
  keys.clear();
}

module.exports = {
  saveDrop,
  getDrop,
  getKey,
  deleteKey,
  updateDrop,
  clearStore
};
