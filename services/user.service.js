import { supabase } from "../config/supabase.js";
import crypto from "crypto";

export async function createUser(phone, email = null) {
  return supabase.from("users")
    .insert({ email, phone })
    .select()
    .single();
}

export async function getUser(id) {
  return supabase.from("users")
    .select("*")
    .eq("id", id)
    .single();
}

export async function getWallet(id) {
  return supabase.from("wallets")
    .select("*")
    .eq("id", id)
    .single();
}


export async function getUserData(phone) {
  return supabase.from("users")
    .select("*")
    .eq("phone", phone)
    .single();
}

export async function updateUserEmail(id, email) {
  return supabase.from('users')
    .update({ email })
    .eq('id', id)
    .select()
    .single();
}

export async function saveWallet(userId, address, privateKeyEncrypted, mnemonic, multiAddresses) {
  const hederaMemo = crypto.randomUUID().substring(0, 8).toLowerCase();
  return supabase.from("wallets")
    .insert({
      user_id: userId,
      address,
      private_key: privateKeyEncrypted,
      mnemonic_phrase: mnemonic,
      multi_addresses: multiAddresses,
      hedera_memo: hederaMemo
    });
}

export async function updateWalletData(walletId, encryptedKeys, multiAddresses) {
  const { data, error } = await supabase.from("wallets")
    .update({
      private_key: encryptedKeys,
      multi_addresses: multiAddresses
    })
    .eq("id", walletId);
    
  if (error) {
    console.error(`[DB_ERROR] Failed to update wallet ${walletId}:`, error.message);
  }
  return { data, error };
}

export async function getUserWallets(userId) {
  return supabase.from("wallets")
    .select("*")
    .eq("user_id", userId);
}

// Save a message to the database
export async function saveChatMessage(userId, role, content) {
  return await supabase
    .from("chat_history")
    .insert({
      user_id: userId,
      role: role, 
      content: content
    });
}

/**
 * Message deduplication helpers.
 * We record inbound message events (source + message_id) in a `message_events` table to
 * prevent processing the same webhook twice (providers may retry). These helpers are
 * resilient: if the table or DB call fails, they fail-open so we don't block messages.
 */
export async function hasProcessedMessage(source, messageId) {
  try {
    const { data } = await supabase
      .from("message_events")
      .select("id")
      .eq("source", source)
      .eq("message_id", messageId)
      .limit(1);

    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.error("hasProcessedMessage error:", err);
    // Fail open: assume not processed so the message can be handled
    return false;
  }
}

export async function markMessageProcessed(source, messageId, userId = null) {
  try {
    const { data, error } = await supabase
      .from("message_events")
      .insert({
        source,
        message_id: messageId,
        user_id: userId
      });

    if (error) {
      // If it's a duplicate/unique constraint error, treat as already processed
      if (error.message && error.message.toLowerCase().includes("duplicate")) {
        return false;
      }
      console.error("markMessageProcessed insert error:", error);
      // Fail open: allow processing if DB insert fails
      return true;
    }

    return true;
  } catch (err) {
    console.error("markMessageProcessed error:", err);
    // Fail open: allow processing if DB call fails
    return true;
  }
}

export async function getChatHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from("chat_history")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }) 
    .limit(limit);

  if (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }

  // Reverse to make it chronological (Oldest -> Newest)
  // FORMAT FIX: Clean object for OpenAI/NVIDIA
  return data.reverse().map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user', 
    content: msg.content
  }));
}

export async function saveTransaction({ userId, walletId, fromAddress, toAddress, amount, chain, tokenSymbol, txHash, status = 'confirmed' }) {
  return await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      wallet_id: walletId,
      from_address: fromAddress,
      to_address: toAddress,
      amount: parseFloat(amount),
      chain: chain.toLowerCase(),
      token_symbol: tokenSymbol || 'NATIVE',
      tx_hash: txHash,
      status: status
    });
}

export async function getTransactionHistory(userId, limit = 5) {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, chain, token_symbol, to_address, status, created_at, tx_hash")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
  return data;
}

export async function createLoan(userId, walletId, ngnAmount, usdcAmount, bankAccount, bankCode, chain) {
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return await supabase.from('loans').insert({
    user_id: userId,
    wallet_id: walletId,
    amount_ngn: ngnAmount,
    amount_usdc: usdcAmount,
    bank_account: bankAccount,
    bank_code: bankCode,
    chain: chain,
    due_date: dueDate,
    status: 'locked'
  }).select().single();
}

export async function getActiveLoans(userId, chain) {
  return await supabase.from('loans').select('*').eq('user_id', userId).eq('chain', chain).eq('status', 'locked');
}

export async function getAllActiveLoans(userId) {
  return await supabase.from('loans').select('*').eq('user_id', userId).eq('status', 'locked');
}

export async function updateLoanStatus(loanId, status) {
  return await supabase.from('loans').update({ status }).eq('id', loanId);
}

/**
 * Hedera Treasury Helpers
 */

export async function getWalletByMemo(memo) {
  if (!memo) return null;
  const { data } = await supabase
    .from("wallets")
    .select("*")
    .eq("hedera_memo", memo.trim().toLowerCase())
    .single();
  return data || null;
}

export async function creditWalletHbar(walletId, amount, txId) {
  const { data: existing } = await supabase.from("processed_hedera_txs").select("tx_hash").eq("tx_hash", txId).single();
  if (existing) return { success: false };

  await supabase.from("processed_hedera_txs").insert({ tx_hash: txId, amount, wallet_id: walletId });

  const { data: wallet } = await supabase.from("wallets").select("hbar_balance").eq("id", walletId).single();
  const newBalance = (parseFloat(wallet.hbar_balance || 0) + parseFloat(amount)).toFixed(8);
  
  return await supabase.from("wallets").update({ hbar_balance: newBalance }).eq("id", walletId);
}

export async function deductWalletHbar(walletId, amount) {
  const { data: wallet } = await supabase.from("wallets").select("hbar_balance").eq("id", walletId).single();
  const newBalance = (parseFloat(wallet.hbar_balance || 0) - parseFloat(amount)).toFixed(8);
  return await supabase.from("wallets").update({ hbar_balance: newBalance }).eq("id", walletId);
}
