require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const fs = require("fs");

// Load secrets from .env
const BOT_TOKEN = process.env.BOT_TOKEN;
const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const userData = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `
👋 Welcome to Udyogvikas Skills Bot!

Use /lead to register your details.
  `,
  );
});

bot.onText(/\/lead/, (msg) => {
  const userId = msg.from.id;
  userData[userId] = { step: 1 };
  bot.sendMessage(msg.chat.id, "📝 Please enter your *Full Name*:", {
    parse_mode: "Markdown",
  });
});

bot.on("message", async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userData[userId] || text.startsWith("/")) return;

  const step = userData[userId].step;

  switch (step) {
    case 1:
      userData[userId].name = text;
      userData[userId].step = 2;
      bot.sendMessage(chatId, "📱 Enter your *Phone Number*:", {
        parse_mode: "Markdown",
      });
      break;
    case 2:
      userData[userId].phone = text;
      userData[userId].step = 3;
      bot.sendMessage(chatId, "🏙️ Enter your *City*:", {
        parse_mode: "Markdown",
      });
      break;
    case 3:
      userData[userId].city = text;
      userData[userId].step = 4;
      bot.sendMessage(chatId, "📚 What *Course* are you interested in?", {
        parse_mode: "Markdown",
      });
      break;
    case 4:
      userData[userId].course = text;
      userData[userId].username = msg.from.username || "N/A";
      userData[userId].userId = userId;
      userData[userId].chatId = chatId;

      await handleLead(userData[userId]);
      delete userData[userId];
      break;
  }
});

async function handleLead(data) {
  const chatId = data.chatId;

  try {
    // Save to Google Sheet
    const response = await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.text();
    const parsed = JSON.parse(result);

    if (parsed.status !== "success")
      throw new Error(parsed.message || "Unknown error");

    // Confirm to user
    await bot.sendMessage(
      chatId,
      `
✅ *Registration Successful!*

👤 Name: ${data.name}
📱 Phone: ${data.phone}
🏙️ City: ${data.city}
📚 Course: ${data.course}
    `,
      { parse_mode: "Markdown" },
    );

    // Send brochure (PDF or image
}

async function sendEmailToAdmin(data) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_PASS,
    },
  });

  const mailOptions = {
    from: `"Udyogvikas Bot" <${process.env.ADMIN_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "New Lead Registered",
    text: `
New lead received:

Name: ${data.name}
Phone: ${data.phone}
City: ${data.city}
Course: ${data.course}
Telegram: @${data.username}
User ID: ${data.userId}
    `,
  };

  await transporter.sendMail(mailOptions);
}

bot.on("polling_error", (err) => console.error("Polling error:", err));
console.log("✅ Bot is running...");

