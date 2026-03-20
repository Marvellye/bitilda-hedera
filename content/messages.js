import { CONFIG } from '../config/constants.js';

export const MESSAGES = {
  welcomeNewUser: (number, walletAddress) => `
*🚀 Bitilda Is Live — Welcome!*
*Your AI-powered Hedera Wallet.*

*📱 ID:* ${number}
*💼 Your Hedera Address:*
\`${walletAddress}\`

Here are our main features:
✅ *Send/Receive HBAR* (Instant)
✅ *Chat with Wallet Manager* (AI)
✅ *Get Notified on Deposits* (Live)
✅ *Buy HBAR with Fiat* (Paystack)
✅ *Cashout HBAR to Fiat* (Offramp)
✅ *Stake HBAR for Instant Fiat* (Loan)

With Bitilda, managing your Hedera assets has never been easier!`, 

  walletNotFound: "Error: Your wallet was not found.",
  invalidAmount: "Invalid amount. Please try again.",
  invalidChain: "❌ Only Hedera is supported for this application.",
  invalidAddress: "Invalid wallet address. Please try again.",
  recipientNotFound: (phone) => `❌ Recipient with phone number *${phone}* is not registered on Bitilda.`,
  insufficientFunds: (current, needed, chain) => 
    `❌ Insufficient funds on Hedera.\nBalance: ${current} HBAR.\n${needed ? `Needed: ${needed} HBAR` : ''}`,

  sentSuccess: (amount, to, tx, chain, explorer) => 
    `✅ Sent *${amount} HBAR* to \`${to}\`\n\n*Transaction ID:* \n\`${tx}\`${explorer ? `\n\n🔍 *Explorer:* ${explorer}` : ''}`,
  
  sentFail: (chain) => `❌ Failed to send transaction on Hedera. Please try again later.`,

  sendConfirm: (amount, token, to, chain, gasFee, gasFeeSymbol) => {
    return `⚠️ *Transaction Confirmation*\n\n` +
      `💸 *Amount:* ${amount} HBAR\n` +
      `🌐 *Network:* Hedera\n` +
      `📬 *To:* \`${to}\`\n\n` +
      `⛽ *Gas Fee:* ~${gasFee} ${gasFeeSymbol}\n\n` +
      `Reply with *confirm* to execute.`;
  },

  invalidPrivateKey: "❌ Invalid private key or wallet configuration.",

  balanceCheck: (balances) => {
    let msg = "*Your balances:*\n\n";
    if (balances.hedera) {
      msg += "📶 *Hedera*\n";
      msg += `- ${balances.hedera.native} HBAR \n\n`;
    } 
    return msg.trim();
  },

  depositInfo: (addr, chain = 'hedera', memo = null) => {
      return `*📥 Deposit to Hedera*\n\n` +
             `🏦 *Wallet ID:* \`${CONFIG.HEDERA_TREASURY_WALLET}\`\n` +
             `🏷️ *Your Unique Memo:* \`${memo}\`\n\n` +
             `⚠️ *IMPORTANT:* You MUST include the memo above when withdrawing from Bybit or other exchanges.`;
  },

  sendInstructions: 
    `*💸 How to Send HBAR*\n\nFormat:\nsend <amount> <address_or_phone>\n\nExamples:\n• \`send 10 0.0.123456\`\n• \`send 25 +2348012345678\``,

  aiSystemPrompt: (balance, address) => `
You are Bitilda, an advanced AI Hedera wallet manager. Always use emojis. 🤖
Features:
- Check Balance: { "tool": "balance" }
- Send HBAR: { "tool": "send", "amount": "10", "to": "0.0.123456" }
- Buy HBAR with Fiat: { "tool": "onramp", "usd_amount": "50" }
- Cashout HBAR to Fiat: { "tool": "cashout", "amount": "100" } (User gets Naira in their bank)
- Stake HBAR for Fiat (Loan): { "tool": "stake", "amount": "1000" } (User locks HBAR, gets instant Naira)
`,

  // Buy/Onramp
  buyHbarPrompt: (address) =>
    `*📉 Buy HBAR with Fiat*\n\nHow much USD worth of HBAR would you like to buy? Reply with the amount (e.g., 20) or type: *Buy 20* to start.\n\nYour receiving wallet: \`${address}\``,

  onrampConfirm: (usd, naira, rate, address) =>
    `You are about to pay *₦${naira.toLocaleString()}* ($${usd}) to receive HBAR at rate of *₦${rate}* /USD for wallet:\n\`${address}\`\n\nReply with *confirm* to proceed.`,

  onrampInit: (url, ref) =>
    `✅ *Onramp Initialized!*
Please complete the payment via Paystack:
${url}

*Reference:* ${ref}
Once paid, your HBAR will be automatically credited. 🚀`,

  requestEmailForOnramp: () =>
    `We need your email for the Paystack transaction. Please reply with your email address (e.g., hello@bitilda.com).`,

  // Cashout
  cashoutPrompt: () =>
    `*💸 Cashout HBAR to Fiat*\n\nPlease provide your cashout details in this format:\ncashout <amount_hbar> <account_number> <bank_code>\n\nExample:\ncashout 100 0123456789 058 (GTBank)`,

  cashoutSuccess: (naira) =>
    `✅ Success! *₦${naira.toLocaleString()}* has been sent to your bank account. Your HBAR balance has been updated. 💰`,

  // Staking/Loan
  stakeConfirm: (hbar, naira, bank) =>
    `⚠️ *HBAR Staking Confirmation*\n\nYou are staking *${hbar} HBAR* as collateral. You will receive an instant fiat payout of *₦${naira.toLocaleString()}* into your bank account (*${bank}*).\n\nYour staked balance will be locked until the loan is repaid. Reply with *confirm stake* to proceed.`,

  stakeSuccess: (hbar, naira) =>
    `✅ Staking Success! *${hbar} HBAR* is now staked. ₦${naira.toLocaleString()} has been sent to your bank. 🚀`,

  aiBusy: "🤖 AI is currently busy. Please try again."
};