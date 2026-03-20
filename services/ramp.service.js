import dotenv from 'dotenv';
import { initializePaystackTransaction, verifyPaystackPayment, createTransferRecipient, initiateTransfer } from './paystack.service.js';
import { supabase } from "../config/supabase.js";
import { usdToNgn, usdToKobo } from '../utils/conversion.js';
import axios from 'axios';
import { saveChatMessage } from './user.service.js';
import { sendTx } from './wallet.service.js';
import { CONFIG } from '../config/constants.js';

dotenv.config();

/**
 * Creates intent for HBAR buy (onramp)
 */
export async function createOnrampIntent(user_id, usd_amount, wallet_address) {
  const minimumUSD = 1.0; 
  if (!usd_amount || typeof usd_amount !== 'number' || usd_amount < minimumUSD) {
    throw new Error(`Minimum amount is ${minimumUSD} USD`);
  }

  const trx_ref = `hbar_buy_intent_${Date.now()}`;
  const hbar_amount = usd_amount; // Simplified placeholder, usually involves price check

  const { data: intent, error } = await supabase.from('onRamp')
    .insert({ user_id, usdt_amount: usd_amount, wallet_address, trx_ref, status: 'intent' }) // "usdt_amount" column reused for USD value
    .select()
    .single();

  if (error) throw error;
  return intent;
}

/**
 * Initializes Buy HBAR payment
 */
export async function initOnRamp(user_id, usd_amount, wallet_address, intentId = null) {
  const trx_ref = `hbar_buy_${Date.now()}`;
  const naira_amount = await usdToNgn(usd_amount);
  const amountInKobo = await usdToKobo(usd_amount);

  const { data: user, error: userErr } = await supabase.from('users').select('email').eq('id', user_id).single();
  if (userErr || !user.email) throw new Error('User email not found');

  let onramp;
  if (intentId) {
    const { data } = await supabase.from('onRamp')
      .update({ usdt_amount: usd_amount, naira_amount, trx_ref, status: 'pending' })
      .eq('id', intentId)
      .select().single();
    onramp = data;
  } else {
    const { data } = await supabase.from('onRamp')
      .insert({ user_id, usdt_amount: usd_amount, naira_amount, wallet_address, trx_ref, status: 'pending' })
      .select().single();
    onramp = data;
  }

  const authorizationUrl = await initializePaystackTransaction({
    email: user.email,
    amount: amountInKobo,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
    reference: trx_ref,
    metadata: { trx_ref, user_id }
  });

  return { authorization_url: authorizationUrl, trx_ref, onramp };
}

/**
 * Verifies Paystack buy payment and processes HBAR fulfillment
 */
export async function verifyAndProcessOnramp(trx_ref) {
  try {
    const paymentData = await verifyPaystackPayment(trx_ref);
    if (paymentData.status !== 'success') {
      return { success: false, message: `Payment failed or pending.` };
    }

    // Process HBAR transfer in background
    processOnrampSuccess(trx_ref);
    return { success: true, message: "✅ Payment verified! Your *HBAR* is being sent to your wallet shortly." };
  } catch (err) {
    console.error("[BUY-HBAR] Verification failed:", err.message);
    return { success: false, message: `❌ Verification failed: ${err.message}` };
  }
}

/**
 * Fulfills HBAR purchase by sending from treasury
 */
async function processOnrampSuccess(trx_ref) {
  try {
    const { data: onramp } = await supabase.from('onRamp').select('*').eq('trx_ref', trx_ref).single();
    if (!onramp || onramp.status === 'completed') return;

    await supabase.from('onRamp').update({ status: 'completed' }).eq('id', onramp.id);

    // Call Bybit infrastructure or direct Treasury send
    // For this context, we'll send HBAR from treasury to user address
    const { getCryptoPrice } = await import("./bybit.service.js");
    const hbarPrice = await getCryptoPrice("HBAR").catch(() => 0.08); // fallback
    const hbarAmountToSend = (parseFloat(onramp.usdt_amount) / hbarPrice).toFixed(2);

    console.log(`[BUY-HBAR] Sending ${hbarAmountToSend} HBAR to ${onramp.wallet_address}`);
    
    // sendTx handles treasury-bypass when walletId is provided and enough HBAR balance in DB
    // But since it's an external buy, we use the raw Treasury wallet send
    const txId = await sendTx(CONFIG.TREASURY_PRIVATE_KEY, onramp.wallet_address, hbarAmountToSend, "hedera");

    const successMsg = `🎉 *Purchase Successful!*\n\n*${hbarAmountToSend} HBAR* has been sent to your wallet.\n\n*Tx Hash:* \`${txId}\``;
    await saveChatMessage(onramp.user_id, 'assistant', successMsg);
  } catch (err) {
    console.error("[BUY-HBAR] Fulfillment failed:", err.message);
  }
}

/**
 * Processes HBAR to Fiat (Cashout/Offramp)
 */
export async function processCashout(userId, hbarAmount, bankAccount, bankCode, bankName) {
  try {
    const { getCryptoPrice } = await import("./bybit.service.js");
    const hbarPrice = await getCryptoPrice("HBAR").catch(() => 0.08);
    const usdValue = parseFloat(hbarAmount) * hbarPrice;
    const nairaAmount = await usdToNgn(usdValue);
    const koboAmount = Math.floor(nairaAmount * 100);

    console.log(`[CASHOUT] Processing cashout for ${userId}: ${hbarAmount} HBAR -> ₦${nairaAmount}`);

    // 1. Create recipient
    const recipientCode = await createTransferRecipient(userId.toString(), bankAccount, bankCode);
    
    // 2. Initiate Paystack transfer
    const result = await initiateTransfer(koboAmount, recipientCode, `HBAR Offramp: ${hbarAmount} HBAR`);
    
    if (result.status) {
       return { success: true, message: `✅ Cashout processed! *₦${nairaAmount.toLocaleString()}* is being sent to your bank account via Paystack.` };
    } else {
       throw new Error(result.message);
    }
  } catch (err) {
    console.error("[CASHOUT] Error:", err.message);
    throw err;
  }
}

/**
 * Processes HBAR Stake (Loan)
 * User stalls HBAR as collateral and gets Fiat Naira instantly.
 */
export async function processStakeLoan(userId, walletId, hbarCollateral, bankAccount, bankCode) {
  try {
    const { getCryptoPrice } = await import("./bybit.service.js");
    const hbarPrice = await getCryptoPrice("HBAR").catch(() => 0.08);
    const collateralValueUsd = parseFloat(hbarCollateral) * hbarPrice;
    
    // LTV (Loan to Value) - Give 50% of the collateral value in Fiat
    const loanValueUsd = collateralValueUsd * 0.5; 
    const nairaToPay = await usdToNgn(loanValueUsd);
    const koboToPay = Math.floor(nairaToPay * 100);

    const { createLoan, deductWalletHbar } = await import("./user.service.js");

    // 1. Record Loan and Lock HBAR in DB (Internal Accounting)
    // deductWalletHbar will decrement the internal tracker while the user "stakes"
    await deductWalletHbar(walletId, hbarCollateral.toString());
    await createLoan(userId, walletId, nairaToPay, hbarCollateral, bankAccount, bankCode, "hedera");

    // 2. Send Fiat (Paystack)
    const recipientCode = await createTransferRecipient(userId.toString(), bankAccount, bankCode);
    await initiateTransfer(koboToPay, recipientCode, `Hedera HBAR Staking Loan`);

    return { success: true, naira: nairaToPay, hbar: hbarCollateral };
  } catch (err) {
    console.error("[STAKE-LOAN] Error:", err.message);
    throw err;
  }
}
