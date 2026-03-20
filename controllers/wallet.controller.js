import { supabase } from "../config/supabase.js";
import { sendTx, getBalance } from "../services/wallet.service.js";
import { getNetworkInfo } from "../config/providers.js";

export async function sendCrypto(req, res) {
  // Now accepts 'chain' in body (e.g., "avax", "ethereum", "bsc", "mantle", "cronos")
  const { wallet_id, to, amount, chain } = req.body;
  const selectedChain = chain || "ethereum"; // Default to ETH

  if (!wallet_id || !to || !amount)
    return res.status(400).json({ error: "Missing fields." });

  // Validate chain support
  if (!getNetworkInfo(selectedChain)) {
    return res.status(400).json({ error: `Network ${selectedChain} not supported.` });
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", wallet_id)
    .single();

  if (!wallet) return res.status(404).json({ error: "Wallet not found." });

  try {
    const hash = await sendTx(wallet.private_key, to, amount, selectedChain, null, wallet_id);
    
    const explorerUrl = getNetworkInfo(selectedChain).explorer + hash;

    res.json({ 
      success: true, 
      chain: selectedChain,
      hash,
      explorer: explorerUrl 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Transaction failed. Insufficient funds or network error." });
  }
}

export async function getWalletBalance(req, res) {
  const { address, chain } = req.query;
  const selectedChain = chain || "ethereum";

  try {
    const balance = await getBalance(address, selectedChain);
    const info = getNetworkInfo(selectedChain);
    
    res.json({
      address,
      chain: info.name,
      symbol: info.symbol,
      balance: balance
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}