import axios from "axios";
import Chat from "../models/chat.model.js";
import User from "../models/user.model.js";
import imagekit from "../configs/imageKit.js";
import openai from "../configs/openAI.js";

//Text-based AI chat message controller
export const textMessageController = async (req, res) => {
  try {
    const userId = req.user._id;
    //check user credits
    if (req.user.credits < 1) {
      return res.json({
        success: false,
        message:
          "You don't have enough credits to use this feature. Please purchase more credits.",
      });
    }

    const { chatId, promt } = req.body;

    const chat = await Chat.findOne({ userId, _id: chatId });
    chat.messages.push({
      role: "user",
      content: promt,
      timestamp: Date.now(),
      isImage: false,
    });
    const { choices } = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "user",
          content: promt,
        },
      ],
    });

    const reply = {
      ...choices[0].message,
      timestamp: Date.now(),
      isImage: false,
    };
    res.json({
      success: true,
      message: "Message sent",
      reply,
    });

    chat.messages.push(reply);
    await chat.save();

    await User.updateOne(
      {
        _id: userId,
      },
      { $inc: { credits: -1 } }
    );
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

//Image generation message controller
export const imageMessageController = async (req, res) => {
  try {
    const userId = req.user._id;

    //check user credits
    if (req.user.credits < 2) {
      return res.json({
        success: false,
        message:
          "You don't have enough credits to generate image. Please purchase more credits.",
      });
    }

    const { chatId, promt, isPublished } = req.body;
    //find chat
    const chat = await Chat.findOne({ userId, _id: chatId });

    //push user message
    chat.messages.push({
      role: "user",
      content: promt,
      timestamp: Date.now(),
      isImage: false,
    });

    //Encode the promt
    const encodedPromt = encodeURIComponent(promt);

    //Construct Imagekit AI generation URL
    const generatedImageUrl = `${
      process.env.IMAGEKIT_URL_ENDPOINT
    }/ik-genimg-promt-${encodedPromt}/quickgpt/${Date.now()}.png?tr=w-800,h-800`;

    //Trigger generation by fetching from Imagekit
    const aiImageResponse = await axios.get(generatedImageUrl, {
      responseType: "arraybuffer",
    });

    //convert to Base64
    const base64Image = `data:image/png;base64,${Buffer.from(
      aiImageResponse.data,
      "binary"
    ).toString("base64")} `;

    //upload to image to media library
    const uploadResponse = await imagekit.upload({
      file: base64Image,
      fileName: `${Date.now()}.png`,
      folder: "quickgpt",
    });

    const reply = {
      role: "assistant",
      content: uploadResponse.url,
      timestamp: Date.now(),
      isImage: true,
      isPublished,
    };

    res.json({
      success: true,
      reply,
    });

    chat.messages.push(reply);
    await chat.save();

    await User.updateOne(
      {
        _id: userId,
      },
      { $inc: { credits: -2 } }
    );
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
