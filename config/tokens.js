// config/tokens.js
export const TOKENS = {
  hedera: {},
  'hedera-testnet': {}
};

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint amount) returns (bool)",
  "function symbol() view returns (string)"
];