import { getBalance, getWalletDetails, isEVM } from './wallet.service.js';

const REQUEST_TIMEOUT = 17000; 
const CHAIN_TIMEOUT = 10000;

const CHAINS_CONFIG = {
  hedera: { tokens: [], native: true },
  'hedera-testnet': { tokens: [], native: true }
};

/**
 * Safely fetch balance with timeout
 */
async function fetchBalanceWithTimeout(address, chain, token, timeoutMs = CHAIN_TIMEOUT) {
  try {
    const result = await getBalance(address, chain, token);
    return parseFloat(result) || 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Fetch balances for a single chain
 */
async function fetchChainBalances(walletRow, chain, config) {
  let address;
  try {
    const details = getWalletDetails(walletRow, chain);
    address = details.address;
    if (!address) return {};
  } catch (e) {
    return {};
  }

  const balance = await fetchBalanceWithTimeout(address, chain, 'NATIVE');
  const dbBalance = parseFloat(walletRow.hbar_balance || 0);
  const totalNative = (balance + dbBalance).toFixed(4);

  return { native: totalNative };
}

/**
 * Fetch all balances in parallel
 */
export async function fetchAllBalances(walletRow) {
  try {
    const chainsPromises = Object.entries(CHAINS_CONFIG).map(([chain, config]) =>
      fetchChainBalances(walletRow, chain, config).then(data => [chain, data])
    );

    const results = await Promise.all(chainsPromises);

    const balanceData = {};
    for (const [chain, data] of results) {
      if (Object.keys(data).length > 0) balanceData[chain] = data;
    }

    return balanceData;
  } catch (err) {
    console.error('[PHASE] Balance fetch failed:', err.message);
    return null;
  }
}

/**
 * Fetch a single balance
 */
export async function fetchSingleBalance(walletRow, chain, token = 'NATIVE') {
  try {
    const details = getWalletDetails(walletRow, chain);
    let balance = await fetchBalanceWithTimeout(details.address, chain, token, CHAIN_TIMEOUT);
    
    // --- HEDERA HYBRID BALANCE ---
    if ((chain === 'hedera' || chain === 'hedera-testnet') && (token === 'NATIVE' || !token || token.toUpperCase() === 'HBAR')) {
       balance = (parseFloat(balance) + parseFloat(walletRow.hbar_balance || 0)).toFixed(8);
    }
    
    return balance;
  } catch (e) {
    return 0;
  }
}
