# <p align="center">🚀 Bitilda - Hedera Edition</p>

<p align="center">
  <b>The Future of Hedera-Powered AI Crypto Assistants</b><br>
  <i>Seamlessly manage, transact, and bridge Hedera assets through the power of Conversational AI.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" alt="Maintained">
  <img src="https://img.shields.io/badge/Blockchain-Hedera-blue" alt="Hedera">
  <img src="https://img.shields.io/badge/AI-NVIDIA%20&%20Gemini-orange" alt="AI Powered">
  <img src="https://img.shields.io/badge/Security-AES--256--GCM-red" alt="Security">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Hedera-HBAR-000000?logo=hedera&logoColor=white" alt="Hedera">
  <img src="https://img.shields.io/badge/Network-Mainnet%20%26%20Testnet-blue" alt="Network">
</p>

---

## 🌟 Overview

Bitilda is a specialized AI-powered wallet assistant built for the **Hedera Hackathon**. It simplifies the Hedera ecosystem by providing a natural language interface on **Telegram and WhatsApp**, allowing users to manage HBAR, interact with fiat, and stay notified in real-time.

> "Bitilda makes Hedera as simple as sending a text message."

---

## ✨ Key Selling Points

| Feature                          | Description                                                                                  |
| :------------------------------- | :------------------------------------------------------------------------------------------- |
| **1. ⚡ Send/Receive HBAR**      | Instant HBAR transfers via simple chat commands or AI interaction.                           |
| **2. 🤖 AI Wallet Manager**      | Chat naturally with your wallet to check balances, get advice, or execute transactions.      |
| **3. 🔔 Native Notifications**   | Get instant Telegram alerts when HBAR is deposited into your account.                        |
| **4. 💳 Fiat to HBAR (Buy)**     | Seamlessly pay with Fiat (Paystack) and receive HBAR instantly via our provider integration. |
| **5. 🏦 HBAR to Fiat (Cashout)** | Convert your HBAR back to Fiat and withdraw directly to your bank account via Paystack.      |
| **6. 🔐 HBAR Staking (Loans)**   | Stake your HBAR as collateral to receive instant Fiat liquidity.                             |

---

## 📸 Visuals & Demos

<table align="center">
  <tr>
    <td align="center"><img src="./.bybit/telegram.jpg" width="250px"/><br><b>Telegram Interface</b></td>
    <td align="center"><img src="./.bybit/jericho.png" width="250px"/><br><b>Hedera Native Utility</b></td>
  </tr>
</table>

---

## 🛠️ Tech Stack

### **Backend & Database**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

### **AI & Intelligence**

![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![NVIDIA](https://img.shields.io/badge/NVIDIA-76B900?style=for-the-badge&logo=nvidia&logoColor=white)

### **Blockchain & Payments**

![Hedera](https://img.shields.io/badge/Hedera-000000?style=for-the-badge&logo=hedera&logoColor=white)
![Paystack](https://img.shields.io/badge/Paystack-011B33?style=for-the-badge&logo=paystack&logoColor=white)

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/Marvellye/bitilda-hedera.git
npm install
```

### 2. Configure Environment

Create a `.env` file based on `.env.example`.

```env
HEDERA_TREASURY_WALLET=0.0.xxxxxx
TREASURY_PRIVATE_KEY=...
PAYSTACK_SECRET_KEY=...
TELEGRAM_TOKEN=...
```

### 3. Run the Assistant

```bash
node server.js
```

---

## 🔐 Security

Bitilda implements **Encryption-at-Rest** using **AES-256-GCM**. Your private keys are never stored in plaintext and are only decrypted in-memory during transaction signing.

---

## 🗺️ Roadmap

- [ ] **Phase 1**: Hedera Token Service (HTS) Support
- [ ] **Phase 2**: Scheduled Transactions for recurring bills
- [ ] **Phase 3**: Integration with Hedera dApps via AI
- [ ] **Phase 4**: Multi-sig AI approvals

---

Built with ❤️ for the **Hedera Hackathon**.
