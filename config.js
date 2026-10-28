'use strict';

const NETWORKS = {
  testnet: {
    name: 'testnet',
    chain: 'testnet'
  },
  mainnet: {
    name: 'mainnet',
    chain: 'mainnet'
  }
};

function getNetwork() {
  const name = (process.env.ZCASH_NETWORK || 'testnet').toLowerCase();

  if (!Object.hasOwn(NETWORKS, name)) {
    throw new Error(
      'Invalid ZCASH_NETWORK. Expected "testnet" or "mainnet".'
    );
  }

  return NETWORKS[name];
}

module.exports = { NETWORKS, getNetwork };
