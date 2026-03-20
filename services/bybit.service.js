import axios from 'axios';
import { usdToNgn } from '../utils/conversion.js';

export const BYBIT_BASE_URL = 'https://bitilda.marvelly.com.ng/bybit';

/**
 * Get the current Bybit server time
 * @returns {Promise<object>}
 */
export async function getTime() {
  try {
    const response = await axios.get(`${BYBIT_BASE_URL}/time`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Error fetching Bybit server time:', error.message);
    throw error;
  }
}

/**
 * Get the current USD price of a crypto from Bitilda's Bybit infrastructure
 * @param {string} symbol - The crypto symbol (e.g., BTC, ETH, USDT)
 * @returns {Promise<number>} - The price in USD
 */
export async function getCryptoPrice(symbol) {
  try {
    // Standardize symbol to USDT pair if it's just the coin name
    let bybitSymbol = symbol.toUpperCase();
    if (bybitSymbol === 'USDT') {
      return 1.0; // USDT is always 1 USD for price checks
    }
    
    // Add USDT suffix if not present
    if (!bybitSymbol.endsWith('USDT')) {
      bybitSymbol += 'USDT';
    }

    // Call the new pricing microservice endpoint via path
    const response = await axios.get(`${BYBIT_BASE_URL}/pricing/${bybitSymbol}`, {
      timeout: 8000
    });

    if (response.data.retCode !== 0) {
      throw new Error(`Pricing microservice error: ${response.data.retMsg}`);
    }

    const price = response.data.result.list?.[0]?.lastPrice;
    if (!price) {
      throw new Error(`Price not found for symbol: ${bybitSymbol}`);
    }

    return parseFloat(price);
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    // Fallback for common assets if the infrastructure is down
    if (symbol.toUpperCase() === 'ETH') return 2200; 
    if (symbol.toUpperCase() === 'BTC') return 65000;
    throw error;
  }
}

/**
 * Get crypto price in both USD and NGN
 * @param {string} symbol 
 * @returns {Promise<{symbol: string, usdPrice: number, ngnPrice: number}>}
 */
export async function getCryptoPriceDetailed(symbol) {
  const usdPrice = await getCryptoPrice(symbol);
  const ngnPrice = await usdToNgn(usdPrice);
  
  return {
    symbol: symbol.toUpperCase(),
    usdPrice,
    ngnPrice
  };
}
