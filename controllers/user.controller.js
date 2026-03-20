import { createUser, getUser, getUserData, getUserWallets, saveWallet } from "../services/user.service.js";
import { createNewWallet, getBalance } from "../services/wallet.service.js";

export async function registerUser(req, res) {
  const { email, phone } = req.body;

  if (!phone)
    return res.status(400).json({ error: "Phone is required." });

  const wallet = createNewWallet();

  const { data: user, error } = await createUser(phone, email || null);
  if (error) return res.status(500).json({ error: error.message });

  await saveWallet(user.id, wallet.address, wallet.privateKeyEncrypted);

  return res.json({
    success: true,
    user,
    wallet_address: wallet.address,
  });
}

export async function fetchUser(req, res) {
  const userId = req.params.id;

  const { data: user } = await getUser(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { data: wallets } = await getUserWallets(userId);

  const details = await Promise.all(
    wallets.map(async w => ({
      address: w.address,
      balance: await getBalance(w.address),
    }))
  );

  res.json({ user, wallets: details });
}

export async function fetchUserData(req, res) {
  const userPhone = req.params.phone;

  const { data: user } = await getUserData(userPhone);
  if (!user) return res.status(404).json({ error: "User not found" });

  const userId = user.id;

  const { data: wallets } = await getUserWallets(userId);

  const details = await Promise.all(
    wallets.map(async w => ({
      address: w.address,
      balance: await getBalance(w.address),
    }))
  );

  res.json({ user, wallets: details });
}