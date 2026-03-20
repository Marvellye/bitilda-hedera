import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/user.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";
import paystackRoutes from "./routes/paystack.routes.js";
import { startTelegramBot } from "./controllers/telegram.controller.js";
import { startHederaListener } from "./services/hederaListener.service.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Telegram Bot (Polling)
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
startTelegramBot(bot);

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "content", "index.html")));
app.get("/img", (req, res) => res.sendFile(path.join(__dirname, "content", "Bitilda1.png")));
app.get("/logo.svg", (req, res) => res.sendFile(path.join(__dirname, "content", "logo.svg")));

// Routes for API + WhatsApp Webhooks
app.use("/user", userRoutes);
app.use("/wallet", walletRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/paystack", paystackRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Bitilda running on port", PORT);
    startHederaListener(bot); // Start monitoring Hedera treasury
});