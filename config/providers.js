// config/provider.js
import dotenv from "dotenv";
import { JsonRpcProvider, FallbackProvider } from "ethers";

dotenv.config();

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;

// Reliable Public RPCs (Fallbacks included)
const networks = {
  'hedera': {
    name: "Hedera",
    rpc: process.env.HEDERA_RPC || "https://testnet.hashio.io/api",
    chainId: 296n, 
    symbol: "HBAR",
    explorer: "https://hashscan.io/testnet/transaction/"
  },
  'hedera-testnet': {
    name: "Hedera Testnet",
    rpc: "https://testnet.hashio.io/api",
    chainId: 296n,
    symbol: "HBAR",
    explorer: "https://hashscan.io/testnet/transaction/"
  },
  'hedera-mainnet': {
    name: "Hedera",
    rpc: "https://mainnet.hashio.io/api",
    chainId: 295n,
    symbol: "HBAR",
    explorer: "https://hashscan.io/mainnet/transaction/"
  }
};

const providerCache = {};

export function getProvider(chainKey = "ethereum") {
  const key = chainKey.toLowerCase();
  
  if (!networks[key]) {
    throw new Error(`Unsupported network: ${chainKey}`);
  }

  // If cached, return existing
  if (providerCache[key]) return providerCache[key];

  const networkData = networks[key];
  const configs = [];

  // 1. Add Alchemy if available and supported for this network
  if (ALCHEMY_KEY && networkData.alchemy) {
    configs.push({
      provider: new JsonRpcProvider(networkData.alchemy, networkData.chainId, { staticNetwork: true }),
      priority: 1,
      stallTimeout: 2000,
      weight: 1
    });
  }

  // 2. Add Public RPC as fallback
  configs.push({
    provider: new JsonRpcProvider(networkData.rpc, networkData.chainId, { staticNetwork: true }),
    priority: 2,
    stallTimeout: 3000,
    weight: 1
  });

  const provider = new FallbackProvider(configs);
  providerCache[key] = provider;
  return provider;
}

export function getNetworkInfo(chainKey) {
  return networks[chainKey.toLowerCase()];
}