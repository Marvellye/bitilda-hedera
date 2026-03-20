import express from "express";
import { registerUser, fetchUser, fetchUserData } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/create", registerUser);
router.get("/phone/:phone", fetchUserData);
router.get("/:id", fetchUser);

export default router;