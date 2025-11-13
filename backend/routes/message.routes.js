import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  imageMessageController,
  textMessageController,
} from "../controllers/message.controller";

const messageRouter = express.Router();

messageRouter.post("/text", protect, textMessageController);
messageRouter.post("/image", protect, imageMessageController);

export default messageRouter;
