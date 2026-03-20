import dotenv from 'dotenv';
import axios from 'axios';
import { CONFIG } from '../config/constants.js';

dotenv.config();

const CURRENCY_API_URL = process.env.CURRENCY_API_URL;
export const fetchNairaRate = async () => {
  try {
    const response = await axios.get(CURRENCY_API_URL);
    const baseRate = Math.round(response.data.data.NGN.value);
    const margin = Number(CONFIG.NAIRA_MARGIN || 0);
    const effectiveRate = baseRate + margin;
    console.log('Naira rate:', baseRate, 'margin:', margin, 'effective:', effectiveRate);
    return effectiveRate;
  } catch (error) {
    console.error('Error fetching currency rate:', error);
    throw new Error('Failed to fetch Naira rate');
  }
};

export async function usdToNgn(amount) {
  try {
    const rate = await fetchNairaRate();
    const naira = amount * rate;
    return Math.round(naira);
  } catch (error) {
    console.error('Failed to convert USD to NGN:', error);
    throw error;
  }
}

export async function usdToKobo(amount) {
  // Paystack expects amount in kobo (NGN * 100)
  const naira = await usdToNgn(amount);
  return Math.round(naira * 100);
}

export async function ngnToUsd(amount) {
  try {
    const rate = await fetchNairaRate();
    return amount / rate;
  } catch (error) {
    console.error('Failed to convert NGN to USD:', error);
    throw error;
  }
}