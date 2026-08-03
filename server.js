```javascript
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Keep these in Railway Environment Variables.
// DO NOT put your Telegram bot token in app.js.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Telegram environment variables are missing.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message
      })
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.description || "Telegram API error");
  }

  return data;
}

app.post("/api/wallet-connected", async (req, res) => {
  try {
    const {
      walletType,
      network,
      publicKey
    } = req.body;

    if (!walletType || !network || !publicKey) {
      return res.status(400).json({
        success: false,
        error: "Missing wallet information."
      });
    }

    // Server-generated timestamp.
    const now = new Date();

    const date = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Los_Angeles"
    });

    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Los_Angeles",
      timeZoneName: "short"
    });

    const message =
`🔔 NEW WALLET CONNECTED

Wallet: ${walletType}
Network: ${network}

Public Key:
${publicKey}

Connected: ${date}
Time: ${time}`;

    await sendTelegram(message);

    res.json({
      success: true
    });

  } catch (error) {
    console.error("Wallet notification error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to send notification."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```
