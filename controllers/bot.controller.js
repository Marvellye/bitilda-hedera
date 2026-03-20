import { getUserData, createUser, saveWallet, getUserWallets, saveChatMessage, getChatHistory, saveTransaction, getTransactionHistory, updateUserEmail } from "../services/user.service.js";
import { createNewWallet, sendTx, estimateGasFee } from "../services/wallet.service.js";
import { fetchAllBalances, fetchSingleBalance } from "../services/balanceCache.service.js";
import { generateAIResponse } from "../services/ai.service.js";
import { initOnRamp, createOnrampIntent, verifyAndProcessOnramp, processCashout, processStakeLoan } from "../services/ramp.service.js";
import { supabase } from "../config/supabase.js";
import { MESSAGES } from "../content/messages.js";
import { getNetworkInfo } from "../config/providers.js";
import { getCryptoPriceDetailed } from "../services/bybit.service.js";
import { usdToNgn, fetchNairaRate } from "../utils/conversion.js"; 
import { CONFIG } from "../config/constants.js";

function normalizeChain(chain) {
  if (!chain) return 'hedera';
  const c = chain.toLowerCase();
  const mapping = { 'hbar': 'hedera', 'hedera': 'hedera' };
  return mapping[c] || 'hedera';
}

async function resolveInternalRecipient(phone, chain = 'hedera') {
  let cleanPhone = phone.trim().replace(/\D/g, ''); 
  if (cleanPhone.length === 10) cleanPhone = '234' + cleanPhone;
  else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);

  let { data: recipient } = await getUserData(cleanPhone);
  if (!recipient) return null;

  const { data: wallets } = await getUserWallets(recipient.id);
  const wallet = wallets?.[0];
  if (!wallet) return null;

  const multiAddresses = wallet.multi_addresses || {};
  return { address: multiAddresses['hedera'] || wallet.address };
}

export async function processUserMessageWithTimeout(userId, messageText) {
  console.log(`[BOT] START - Message from ${userId}: "${messageText.substring(0, 50)}..."`);
  const startTime = Date.now();

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Message processing timeout (90s)')), 90000)
  );

  try {
    const result = await Promise.race([
      processUserMessage(userId, messageText),
      timeoutPromise
    ]);
    console.log(`[BOT] END - Processed in ${Date.now() - startTime}ms`);
    return result;
  } catch (err) {
    console.error('[BOT] ERROR:', err.message);
    throw err;
  }
}

export async function processUserMessage(userId, messageText) {
  const cleanText = messageText.trim();
  
  let { data: user } = await getUserData(userId);
  let wallet;

  if (!user) {
    const { data: newUser } = await createUser(userId);
    const newWallet = await createNewWallet();
    await saveWallet(newUser.id, newWallet.address, newWallet.privateKeyEncrypted, newWallet.mnemonic, newWallet.multiAddresses);
    return { type: 'text', content: MESSAGES.welcomeNewUser(userId, newWallet.address) };
  }

  const { data: wallets } = await getUserWallets(user.id);
  wallet = wallets?.[0];
  if (!wallet) return { type: 'text', content: MESSAGES.walletNotFound };

  // --- ENSURE HEDERA MEMO ---
  if (!wallet.hedera_memo) {
     const memo = (user.hedera_memo || (await import("crypto")).randomUUID().substring(0, 8)).toLowerCase();
     await supabase.from("wallets").update({ hedera_memo: memo }).eq("id", wallet.id);
     wallet.hedera_memo = memo;
  }

  // --- EMAIL HANDLING FOR ONRAMP ---
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText)) {
      await updateUserEmail(user.id, cleanText);
      const { data: pendingIntents } = await supabase.from('onRamp').select('*').eq('user_id', user.id).eq('status', 'intent').order('created_at', { ascending: false }).limit(1);
      if (pendingIntents?.[0]) {
          const intent = pendingIntents[0];
          const result = await initOnRamp(user.id, intent.usdt_amount, wallet.address, intent.id);
          return { type: 'text', content: MESSAGES.onrampInit(result.authorization_url, result.trx_ref) };
      }
      return { type: 'text', content: "✅ Email updated! What would you like to do next? 😊" };
  }

  // --- CONFIRMATION HANDLERS ---
  if (/^confirm/i.test(cleanText)) {
      // 1. Pending Send
      const { data: pendingSend } = await supabase.from('pending_sends').select('*').eq('user_id', user.id).eq('status', 'pending').order('id', { ascending: false }).limit(1).single();
      if (pendingSend) {
          await supabase.from('pending_sends').update({ status: 'processing' }).eq('id', pendingSend.id);
          return await handleSendCrypto(user, wallet, pendingSend.amount.toString(), pendingSend.to_address, 'hedera', true, 'HBAR', pendingSend.memo);
      }
      
      // 2. Pending Buy (Onramp)
      const { data: pendingIntent } = await supabase.from('onRamp').select('*').eq('user_id', user.id).eq('status', 'intent').order('created_at', { ascending: false }).limit(1).single();
      if (pendingIntent) {
          if (!user.email) return { type: 'text', content: MESSAGES.requestEmailForOnramp() };
          const result = await initOnRamp(user.id, parseFloat(pendingIntent.usdt_amount), wallet.address, pendingIntent.id);
          return { type: 'text', content: MESSAGES.onrampInit(result.authorization_url, result.trx_ref) };
      }

      // 3. Pending Stake/Loan
      const { data: pendingStake } = await supabase.from('pending_loans').select('*').eq('user_id', user.id).eq('status', 'pending').single();
      if (pendingStake && cleanText.toLowerCase().includes('stake')) {
          await supabase.from('pending_loans').update({ status: 'completed' }).eq('id', pendingStake.id);
          const res = await processStakeLoan(user.id, wallet.id, pendingStake.hbar_amount, pendingStake.bank_account, pendingStake.bank_code);
          return { type: 'text', content: MESSAGES.stakeSuccess(res.hbar, res.naira) };
      }
  }

  // Handle Cashout Command (Offramp)
  const cashMatch = cleanText.match(/^cashout\s+([\d.]+)\s+(\d{10})\s+(\d{3})$/i);
  if (cashMatch) {
      const amount = cashMatch[1];
      const account = cashMatch[2];
      const bank = cashMatch[3];
      const currentBal = await fetchSingleBalance(wallet, 'hedera', 'HBAR');
      if (parseFloat(amount) > currentBal) return { type: 'text', content: MESSAGES.insufficientFunds(currentBal, amount, 'hedera') };
      
      const res = await processCashout(user.id, amount, account, bank);
      return { type: 'text', content: res.message };
  }

  // Handle Stake Command (Loan)
  const stakeMatch = cleanText.match(/^stake\s+([\d.]+)\s+(\d{10})\s+(\d{3})$/i);
  if (stakeMatch) {
      const amount = stakeMatch[1];
      const account = stakeMatch[2];
      const bank = stakeMatch[3];
      const currentBal = await fetchSingleBalance(wallet, 'hedera', 'HBAR');
      if (parseFloat(amount) > currentBal) return { type: 'text', content: MESSAGES.insufficientFunds(currentBal, amount, 'hedera') };
      
      const { getCryptoPrice } = await import("../services/bybit.service.js");
      const hbarPrice = await getCryptoPrice("HBAR").catch(() => 0.08);
      const naira = await usdToNgn(parseFloat(amount) * hbarPrice * 0.5); // 50% LTV
      
      await supabase.from('pending_loans').upsert({ user_id: user.id, hbar_amount: amount, bank_account: account, bank_code: bank, status: 'pending' }, { onConflict: 'user_id' });
      return { type: 'text', content: MESSAGES.stakeConfirm(amount, naira, account) };
  }

  // Handle "Buy HBAR"
  if (cleanText.toLowerCase().includes("buy")) {
      const buyHbarMatch = cleanText.match(/buy\s+([\d.]+)/i);
      if (buyHbarMatch) {
          const usdAmount = parseFloat(buyHbarMatch[1]);
          const rate = await fetchNairaRate();
          const naira = usdAmount * rate;
          await createOnrampIntent(user.id, usdAmount, wallet.address);
          return { type: 'text', content: MESSAGES.onrampConfirm(usdAmount, naira, rate, wallet.address) };
      }
      return { type: 'text', content: MESSAGES.buyHbarPrompt(wallet.address) };
  }

  // Standard HBAR Send
  const sendMatch = cleanText.match(/^send\s+([\d.]+)\s+(?:to\s+)?([a-zA-Z0-9+.:-]+)$/i);
  if (sendMatch) {
    let amount = sendMatch[1];
    let toAddress = sendMatch[2];
    const isPhone = /^\+?[\d]{7,15}$/.test(toAddress);
    if (isPhone) {
      const resolved = await resolveInternalRecipient(toAddress);
      if (!resolved) return { type: 'text', content: MESSAGES.recipientNotFound(toAddress) };
      toAddress = resolved.address;
    }
    return await handleSendCrypto(user, wallet, amount, toAddress, 'hedera');
  }

  // Menu options
  switch (cleanText) {
    case "1": return { type: 'text', content: MESSAGES.balanceCheck(await fetchAllBalances(wallet)) };
    case "2": {
      const qrUrl = `https://bitilda.marvelly.com.ng/qr/${wallet.address}.png`; 
      return { type: 'image', url: qrUrl, content: MESSAGES.depositInfo(wallet.address, 'hedera', wallet.hedera_memo) };
    }
    case "3": return { type: 'text', content: MESSAGES.sendInstructions };
    case "4": return { type: 'text', content: MESSAGES.buyHbarPrompt(wallet.address) };
  }

  return await handleIntelligentResponse(user, wallet, cleanText);
}

async function handleSendCrypto(user, wallet, amountStr, toAddress, chainInput, confirmed = false, tokenSymbol = 'HBAR', memo = null) {
  const chainKey = normalizeChain(chainInput);
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return { type: 'text', content: MESSAGES.invalidAmount };

  try {
    let currentBalance = await fetchSingleBalance(wallet, chainKey, tokenSymbol);
    if (amount > currentBalance) return { type: 'text', content: MESSAGES.insufficientFunds(currentBalance, amount, chainKey) };

    if (!confirmed) {
      const gasFee = await estimateGasFee(wallet.private_key, toAddress, amount, chainKey, tokenSymbol, wallet.id);
      await supabase.from('pending_sends').upsert({ user_id: user.id, amount, to_address: toAddress, chain: chainKey, token_symbol: tokenSymbol, status: 'pending', memo }, { onConflict: 'user_id' });
      return { type: 'text', content: MESSAGES.sendConfirm(amount, tokenSymbol, toAddress, chainKey, gasFee.fee, gasFee.symbol) };
    }

    const txHash = await sendTx(wallet.private_key, toAddress, amount, chainKey, tokenSymbol, wallet.id, memo);
    await saveTransaction({ userId: user.id, walletId: wallet.id, fromAddress: wallet.address, toAddress, amount, chain: chainKey, tokenSymbol, txHash });
    return { type: 'text', content: MESSAGES.sentSuccess(amount, toAddress, txHash, chainKey, `https://hashscan.io/mainnet/transaction/${txHash}`) };
  } catch (err) {
    console.error('[SEND] Error:', err.message);
    return { type: 'text', content: MESSAGES.sentFail(chainKey) };
  }
}

async function handleIntelligentResponse(user, wallet, text) {
  const dbHistory = await getChatHistory(user.id, 3);
  await saveChatMessage(user.id, 'user', text);

  const systemPrompt = MESSAGES.aiSystemPrompt(0, wallet.address);
  let aiResponse = await generateAIResponse([{ role: "system", content: systemPrompt }, ...dbHistory], text);

  let toolData = null;
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) toolData = JSON.parse(jsonMatch[0]);
  } catch (e) { /* ignore */ }

  if (toolData && toolData.tool) {
    if (toolData.tool === 'balance') return { type: 'text', content: MESSAGES.balanceCheck(await fetchAllBalances(wallet)) };
    if (toolData.tool === 'send' && toolData.to && toolData.amount) {
        let to = toolData.to.toString();
        if (/^\+?[\d]{7,15}$/.test(to)) {
            const resolved = await resolveInternalRecipient(to);
            if (resolved) to = resolved.address;
        }
        return await handleSendCrypto(user, wallet, toolData.amount.toString(), to, 'hedera', false, 'HBAR', toolData.memo);
    }
    if (toolData.tool === 'onramp') {
       const usdAmount = parseFloat(toolData.usd_amount || 20);
       const rate = await fetchNairaRate();
       await createOnrampIntent(user.id, usdAmount, wallet.address);
       return { type: 'text', content: MESSAGES.onrampConfirm(usdAmount, usdAmount * rate, rate, wallet.address) };
    }
    if (toolData.tool === 'cashout') {
       return { type: 'text', content: MESSAGES.cashoutPrompt() };
    }
    if (toolData.tool === 'stake') {
       return { type: 'text', content: `To stake HBAR for instant fiat, please type: *stake <amount> <account_number> <bank_code>*` };
    }
    if (toolData.tool === 'crypto_price') {
      const { usdPrice, ngnPrice } = await getCryptoPriceDetailed(toolData.symbol || 'hbar');
      const res = toolData.amount ? MESSAGES.cryptoPriceCalc(toolData.symbol, toolData.amount, usdPrice * toolData.amount, ngnPrice * toolData.amount) : MESSAGES.cryptoPrice(toolData.symbol || 'hbar', usdPrice, ngnPrice);
      await saveChatMessage(user.id, 'assistant', res);
      return { type: 'text', content: res };
    }
  }

  await saveChatMessage(user.id, 'assistant', aiResponse);
  return { type: 'text', content: aiResponse };
}