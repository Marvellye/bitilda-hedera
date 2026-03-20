import { Router } from "express";
import { verifyAndProcessOnramp } from "../services/ramp.service.js";

const router = Router();

// Callback for Paystack to verify payments
router.get("/verify/:ref", async (req, res) => {
    const { ref } = req.params;
    const result = await verifyAndProcessOnramp(ref);
    res.json(result);
});

export default router;
