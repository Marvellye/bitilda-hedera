import express from "express";
import { sendCrypto } from "../controllers/wallet.controller.js";

const router = express.Router();

router.post("/send", sendCrypto);

export default router;