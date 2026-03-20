import { Wallet, ethers, formatUnits, parseUnits } from "ethers";
import * as bip39 from "bip39";
import { Client as HederaClient, PrivateKey as HederaPrivateKey, Mnemonic as HederaMnemonic, TransferTransaction, Hbar } from "@hashgraph/sdk";
import { getProvider } from "../config/providers.js"; 
import { encrypt, decrypt } from "../utils/crypto.js";
import { getCryptoPrice } from "./bybit.service.js";
import { CONFIG } from "../config/constants.js";
import { getNetworkInfo } from "../config/providers.js";

const BALANCE_FETCH_TIMEOUT = 8000; 
const RPC_RETRY_ATTEMPTS = 2; 
const RPC_RETRY_DELAY = 200; 

/**
 * Creates a single seed phrase and derives Hedera wallet.
 */
export async function createNewWallet() {
  const mnemonic = Wallet.createRandom().mnemonic.phrase;
  return await deriveAllFromMnemonic(mnemonic);
}

/**
 * Derives Hedera wallet from a single BIP39 mnemonic.
 */
export async function deriveAllFromMnemonic(mnemonic) {
  // 1. Hedera (Standard ECDSA derivation for EVM alias support)
  const hederaMnemonic = await HederaMnemonic.fromString(mnemonic);
  const hederaKey = await hederaMnemonic.toStandardECDSAsecp256k1PrivateKey();
  const hederaAddress = `0x${hederaKey.publicKey.toEvmAddress()}`;
  
  const walletData = {
    hedera: {
      address: hederaAddress, 
      publicKey: hederaKey.publicKey.toString(),
      privateKey: hederaKey.toString()
    }
  };

  return {
    address: hederaAddress, 
    multiAddresses: {
      hedera: hederaAddress,
    },
    privateKeyEncrypted: encrypt(JSON.stringify(walletData)),
    mnemonic: mnemonic
  };
}

// Helper to retry failing RPC calls
async function tryCallWithRetries(fn, attempts = RPC_RETRY_ATTEMPTS, delayMs = RPC_RETRY_DELAY) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastErr;
}

const HEDERA_CHAINS = ['hedera', 'hedera-testnet', 'hedera-mainnet'];

export function isEVM(chain) {
  return HEDERA_CHAINS.includes(chain.toLowerCase());
}

/**
 * Decrypts and parses the private keys for a wallet.
 */
export function getWalletDetails(walletEntry, chain = 'hedera') {
  const decrypted = decrypt(walletEntry.private_key || walletEntry.privateKey);
  const chainKey = chain.toLowerCase();

  try {
    const data = JSON.parse(decrypted);
    if (data.hedera) return data.hedera;
    throw new Error(`Chain ${chain} not found in this wallet.`);
  } catch (e) {
    if (isEVM(chainKey)) {
      return { address: walletEntry.address, privateKey: decrypted };
    }
    throw new Error(`Invalid wallet format.`);
  }
}

// UPGRADED: Get Balance (Only Hedera)
export async function getBalance(address, chain) {
  const chainKey = chain.toLowerCase();

  if (isEVM(chainKey)) {
    try {
        const networkData = getNetworkInfo(chainKey);
        const { default: axios } = await import("axios");
        const resp = await axios.post(networkData.rpc, {
            jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address.startsWith('0x') ? address : `0x${address}`, "latest"]
        });
        if (resp.data.result) return formatUnits(resp.data.result, 18);
        return '0';
    } catch (err) {
        console.warn(`[BALANCE] Hedera balance failed:`, err.message);
        return '0';
    }
  }

  throw new Error(`Unsupported network: ${chain}`);
}

/**
 * Calculates a fee in the target token to compensate for the native gas spent.
 * (Simplified for Hedera)
 */
export async function calculateGasFeeInToken(chain, gasAmountNative, tokenSymbol) {
  return 0; // Hedera focus, skipping complex token fee for now
}

// UPGRADED: Send Transaction (Only Hedera)
export async function sendTx(encryptedPrivKey, toAddress, amount, chain, tokenSymbol = null, walletId = null, memo = null) {
  const chainKey = chain.toLowerCase();

  if (!isEVM(chainKey)) throw new Error(`Unsupported network: ${chain}`);

  // --- HEDERA TREASURY OPTIMIZATION ---
  if (walletId) {
     const { getWallet, deductWalletHbar } = await import("./user.service.js");
     const { data: wallet } = await getWallet(walletId);
     const dbBalance = parseFloat(wallet?.hbar_balance || 0);

     if (dbBalance >= parseFloat(amount)) {
        console.log(`[HEDERA-TREASURY] Sending ${amount} HBAR from treasury for wallet ${walletId}${memo ? ` with memo: ${memo}` : ''}`);
        
        let treasuryKey = CONFIG.TREASURY_PRIVATE_KEY;
        if (treasuryKey && treasuryKey.includes(':')) {
           treasuryKey = decrypt(treasuryKey);
        }
        try {
           const bundle = JSON.parse(treasuryKey);
           treasuryKey = bundle.hedera?.privateKey || bundle.evm?.privateKey || treasuryKey;
        } catch (e) { /* fallback to raw key */ }
        
        const network = chainKey.includes('testnet') ? HederaClient.forTestnet() : HederaClient.forMainnet();
        const client = network.setOperator(CONFIG.HEDERA_TREASURY_WALLET, HederaPrivateKey.fromString(treasuryKey));
        
        const txMemo = memo || `Bitilda Transfer: ${amount} HBAR`;
        const transaction = new TransferTransaction()
          .addHbarTransfer(CONFIG.HEDERA_TREASURY_WALLET, new Hbar(-amount))
          .addHbarTransfer(toAddress, new Hbar(amount))
          .setTransactionMemo(txMemo);
          
        const response = await transaction.execute(client);
        const receipt = await response.getReceipt(client);
        
        if (receipt.status.toString() === 'SUCCESS') {
           const totalToDeduct = parseFloat(amount) + 1;
           await deductWalletHbar(walletId, totalToDeduct.toString());
           return response.transactionId.toString();
        } else {
           throw new Error(`Hedera Treasury Transfer Failed: ${receipt.status.toString()}`);
        }
     } else {
       throw new Error(`Insufficient internal HBAR balance. Balance: ${dbBalance}, Amount: ${amount}`);
     }
  }
  
  // Standard sending if no walletId (Check if it's the Treasury)
  let privateKey = encryptedPrivKey;
  try {
     const decrypted = decrypt(encryptedPrivKey);
     privateKey = decrypted;
     try {
        const bundle = JSON.parse(decrypted);
        privateKey = bundle.hedera?.privateKey || bundle.evm?.privateKey || privateKey;
     } catch (e) { /* fallback */ }
  } catch (e) { /* fallback to raw */ }

  const network = chainKey.includes('testnet') ? HederaClient.forTestnet() : HederaClient.forMainnet();
  
  // If it's a treasury send (Onramp)
  if (privateKey && (privateKey.toString().includes(CONFIG.HEDERA_TREASURY_WALLET) || encryptedPrivKey === CONFIG.TREASURY_PRIVATE_KEY)) {
      const client = network.setOperator(CONFIG.HEDERA_TREASURY_WALLET, HederaPrivateKey.fromString(privateKey));
      const transaction = new TransferTransaction()
        .addHbarTransfer(CONFIG.HEDERA_TREASURY_WALLET, new Hbar(-amount))
        .addHbarTransfer(toAddress, new Hbar(amount))
        .setTransactionMemo(`Bitilda Fulfillment: ${amount} HBAR`);
      const response = await transaction.execute(client);
      await response.getReceipt(client);
      return response.transactionId.toString();
  }

  throw new Error("Direct Hedera SDK send requires AccountID. Please use treasury-based transfers.");
}

/**
 * Estimates the gas/network fee for a send transaction.
 */
export async function estimateGasFee(encryptedPrivKey, toAddress, amount, chain, tokenSymbol = null, walletId = null) {
  const chainKey = chain.toLowerCase();

  if (walletId && isEVM(chainKey)) {
     return { fee: "1.00000000", symbol: "HBAR" }; // Flat 1 HBAR fee for treasury optimization
  }

  return { fee: '0.001', symbol: 'HBAR' };
}

export async function checkIncomingTransaction(fromAddress, toAddress, requiredAmount, chain = "hedera") {
  // Simplified for Hedera, usually would check Mirror Node
  return false; 
}