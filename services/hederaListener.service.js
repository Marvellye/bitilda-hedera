import axios from 'axios';
import { CONFIG } from '../config/constants.js';
import { getWalletByMemo, creditWalletHbar } from './user.service.js';

const POLL_INTERVAL = 60000; // 1 minutes

export async function startHederaListener(bot) {
    console.log(`[HEDERA-MONITOR] Initializing for Treasury: ${CONFIG.HEDERA_TREASURY_WALLET}...`);
    
    // Determine mirror node URL based on RPC
    const mirrorBase = (CONFIG.HEDERA_RPC || '').includes('testnet') 
        ? 'https://testnet.mirrornode.hedera.com/api/v1' 
        : 'https://mainnet-public.mirrornode.hedera.com/api/v1';

    setInterval(async () => {
        try {
            const treasuryId = CONFIG.HEDERA_TREASURY_WALLET;
            if (!treasuryId) return;

            // Fetch last 25 transfers to the treasury wallet
            const url = `${mirrorBase}/transactions?account.id=${treasuryId}&transactiontype=cryptotransfer&result=success&limit=25&order=desc`;
            const { data } = await axios.get(url);

            if (!data || !data.transactions) return;

            for (const tx of data.transactions) {
                // Ignore transactions without memos
                if (!tx.memo_base64) continue;
                
                let memo;
                try {
                    // Decode memo from base64
                    memo = Buffer.from(tx.memo_base64, 'base64').toString('utf8').trim().toUpperCase();
                } catch (e) { continue; }
                
                if (!memo) continue;

                // Try to find wallet with this memo in our DB
                const wallet = await getWalletByMemo(memo);
                if (wallet) {
                    // Calculate total amount sent to treasury in this TX
                    const transfers = tx.transfers.filter(t => t.account === treasuryId && t.amount > 0);
                    const totalTinybars = transfers.reduce((acc, t) => acc + t.amount, 0);
                    
                    if (totalTinybars > 0) {
                        const hbarAmount = totalTinybars / 100_000_000;
                        const txId = tx.transaction_id;

                        // Attempt to credit the wallet
                        const result = await creditWalletHbar(wallet.id, hbarAmount, txId);
                        if (result.success) {
                            console.log(`[HEDERA-MONITOR] ✅ Credited ${hbarAmount} HBAR to Wallet ID: ${wallet.id} (Memo: ${memo})`);
                            
                            // --- NOTIFY USER ---
                            if (bot && wallet.user_id) {
                                const explorerUrl = (mirrorBase || "").includes('testnet') 
                                    ? `https://hashscan.io/testnet/transaction/${txId}`
                                    : `https://hashscan.io/mainnet/transaction/${txId}`;

                                const message = `✅ *Deposit Received!*\n\n` +
                                                `💰 *Amount:* \`${hbarAmount} HBAR\`\n` +
                                                `🔗 *Tx:* [HashScan](${explorerUrl})\n\n` +
                                                `Your balance has been updated. 😊`;
                                                
                                bot.sendMessage(wallet.user_id, message, { parse_mode: 'Markdown' }).catch(err => {
                                    console.warn(`[HEDERA-MONITOR] Failed to notify user ${wallet.user_id}:`, err.message);
                                });
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[HEDERA-MONITOR] ❌ Error:', err.message);
        }
    }, POLL_INTERVAL);
}
