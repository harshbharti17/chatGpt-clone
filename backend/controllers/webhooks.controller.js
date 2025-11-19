// import Stripe from "stripe";
// import Transaction from "../models/transaction.model.js";
// import User from "../models/user.model.js";

// export const stripeWebhooks = async (request, response) => {
//   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

//   const sig = request.headers["stripe-signature"];

//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       request.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (error) {
//     return response.status(400).send(`Webhook Error: ${error.message}`);
//   }

//   try {
//     switch (event.type) {
//       case "payment_intent.succeeded": {
//         const paymentIntent = event.data.object;
//         const sessionList = await stripe.checkout.sessions.list({
//           payment_intent: paymentIntent.id,
//         });

//         const session = sessionList.data[0];
//         const { transactionId, appId } = session.metadata;
//         if (appId === "quickgpt") {
//           const transaction = await Transaction.findOne({
//             _id: transactionId,
//             isPaid: false,
//           });

//           //update credits in user account
//           await User.updateOne(
//             {
//               _id: transaction.userId,
//             },
//             {
//               $inc: {
//                 credits: transaction.credits,
//               },
//             }
//           );

//           //update credit payment status
//           transaction.isPaid = true;
//           await transaction.save();
//         } else {
//           return response.json({
//             received: true,
//             message: "Ignored event : Invalid app",
//           });
//         }
//         break;
//       }

//       default:
//         console.log("Unhandled event type:", event.type);
//         break;
//     }
//   } catch (error) {
//     console.error("Webhook Processing error:", error);
//     response.status(500).send("Internal server error");
//   }
// };

import Stripe from "stripe";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  console.log("🔥 Webhook hit!");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✔ Stripe event constructed:", event.type);
  } catch (error) {
    console.log("❌ Signature verify error:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // -----------------------------
  // CHECKOUT SESSION COMPLETED
  // -----------------------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.log("🔍 Session metadata =", session.metadata);

    const { transactionId, appId } = session.metadata;

    if (appId !== "quickgpt") {
      console.log("❌ Wrong appId", appId);
      return res.json({ received: true });
    }

    // Find transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      isPaid: false,
    });

    console.log("🔍 Found transaction:", transaction);

    if (!transaction) {
      console.log("❌ No transaction found or already paid");
      return res.json({ received: true });
    }

    // Update user credits
    console.log("💰 Adding credits:", transaction.credits);

    await User.updateOne(
      { _id: transaction.userId },
      { $inc: { credits: transaction.credits } }
    );

    transaction.isPaid = true;
    await transaction.save();

    console.log("✅ Credits updated successfully!");
  }

  res.json({ received: true });
};
