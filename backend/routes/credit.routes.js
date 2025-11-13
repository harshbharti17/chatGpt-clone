import express from "express";
import { getPlans, purchasePlan } from "../controllers/credit.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const creditRouter = express.Router();

creditRouter.get("/plan", getPlans);
creditRouter.post("/purchase", protect, purchasePlan);

export default creditRouter;

