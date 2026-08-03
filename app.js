```javascript
const walletButton = document.getElementById("walletButton");
const walletMenu = document.getElementById("walletMenu");
const toast = document.getElementById("toast");

let connectedWallet = null;
let currentBalance = null;

// =====================================================
// TELEGRAM BACKEND NOTIFICATION
// =====================================================

async function notifyTelegram(walletType, network, publicKey) {
  try {
    const response = await fetch(
      "https://YOUR-RAILWAY-BACKEND.up.railway.app/api/wallet-connected",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          walletType,
          network,
          publicKey
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error("Telegram notification failed:", data.error);
    }
  } catch (error) {
    // A Telegram notification failure should not prevent
    // the wallet from connecting.
    console.error("Telegram notification error:", error);
  }
}

// =====================================================
// WALLET MENU
// =====================================================

walletButton.addEventListener("click", () => {
  walletMenu.classList.toggle("open");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".wallet-wrap")) {
    walletMenu.classList.remove("open");
  }
});

// =====================================================
// TOAST
// =====================================================

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

// =====================================================
// ADDRESS DISPLAY
// =====================================================

function shorten(address) {
  if (!address) return "";

  // More of the address is shown than the original version.
  const start = 8;
  const end = 6;

  if (address.length <= start + end + 1) {
    return address;
  }

  return `${address.slice(0, start)}…${address.slice(-end)}`;
}

function displayConnectedAddress(address) {
  walletButton.innerHTML =
    `${shorten(address)} <span>⌄</span>`;
}

// =====================================================
// SEND MODAL REFERENCES
// =====================================================

const sendModal = document.getElementById("sendModal");
const closeSendModal = document.getElementById("closeSendModal");
const walletBalance = document.getElementById("walletBalance");
const sendAmount = document.getElementById("sendAmount");
const sendCurrency = document.getElementById("sendCurrency");
const recipientAddress = document.getElementById("recipientAddress");
const sendNetwork = document.getElementById("sendNetwork");
const sendPreviewAmount = document.getElementById("sendPreviewAmount");
const sendButton = document.getElementById("sendButton");
const sendStatus = document.getElementById("sendStatus");

function openSendModal() {
  if (!sendModal) return;

  sendModal.classList.add("active");
  sendModal.setAttribute("aria-hidden", "false");
}

function closeSendTransactionModal() {
  if (!sendModal) return;

  sendModal.classList.remove("active");
  sendModal.setAttribute("aria-hidden", "true");
}

closeSendModal?.addEventListener(
  "click",
  closeSendTransactionModal
);

sendModal?.querySelector(".send-backdrop")?.addEventListener(
  "click",
  closeSendTransactionModal
);

// =====================================================
// BALANCE LOOKUP — ETH
// =====================================================

async function getEthBalance(address) {
  if (!window.ethereum) {
    throw new Error("Ethereum provider unavailable.");
  }

  const balanceHex = await window.ethereum.request({
    method: "eth_getBalance",
    params: [address, "latest"]
  });

  const wei = BigInt(balanceHex);
  const base = 1000000000000000000n;

  const whole = wei / base;
  const remainder = wei % base;

  const decimal = remainder
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");

  return decimal
    ? `${whole}.${decimal}`
    : whole.toString();
}

// =====================================================
// BALANCE LOOKUP — SOLANA
// =====================================================

async function getSolBalance(address) {
  const provider =
    window.phantom?.solana ||
    window.solana;

  if (!provider) {
    throw new Error("Solana provider unavailable.");
  }

  // Solana injected providers expose request().
  const result = await provider.request({
    method: "getBalance",
    params: [address]
  });

  const lamports =
    typeof result === "object"
      ? result.value
      : result;

  return (
    Number(lamports) / 1000000000
  ).toString();
}

// =====================================================
// SHOW BALANCE AFTER CONNECTION
// =====================================================

async function showConnectedBalance() {
  if (!connectedWallet) return;

  try {
    let balance;

    if (connectedWallet.type === "ETH") {
      balance = await getEthBalance(
        connectedWallet.address
      );

      sendCurrency.textContent = "ETH";
      sendNetwork.textContent = "Ethereum / EVM";
    }

    if (connectedWallet.type === "SOL") {
      balance = await getSolBalance(
        connectedWallet.address
      );

      sendCurrency.textContent = "SOL";
      sendNetwork.textContent = "Solana";
    }

    currentBalance = balance;

    walletBalance.textContent =
      `${balance} ${sendCurrency.textContent}`;

    sendAmount.value = "";
    recipientAddress.value = "";
    sendPreviewAmount.textContent = "—";
    sendStatus.textContent = "";

    // Appears immediately after successful connection.
    openSendModal();

  } catch (error) {
    console.error("Balance lookup failed:", error);

    notify(
      "Wallet connected, but balance could not be loaded."
    );
  }
}

// =====================================================
// AMOUNT PREVIEW
// =====================================================

sendAmount?.addEventListener("input", () => {
  const amount = sendAmount.value;

  sendPreviewAmount.textContent =
    amount
      ? `${amount} ${sendCurrency.textContent}`
      : "—";
});

// =====================================================
// ETH SEND
// =====================================================

async function sendEth() {
  if (!window.ethereum) {
    throw new Error("Ethereum wallet unavailable.");
  }

  const recipient = recipientAddress.value.trim();
  const amount = sendAmount.value.trim();

  if (!recipient) {
    throw new Error("Enter a recipient address.");
  }

  if (!window.ethereum) {
    throw new Error("Ethereum provider unavailable.");
  }

  // Validate recipient through the wallet provider.
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new Error("Enter a valid Ethereum address.");
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error("Enter a valid amount.");
  }

  // Convert ETH to wei without floating-point arithmetic.
  const [whole = "0", fraction = ""] =
    amount.split(".");

  const paddedFraction =
    fraction.padEnd(18, "0").slice(0, 18);

  const wei =
    BigInt(whole) * 1000000000000000000n +
    BigInt(paddedFraction || "0");

  const value =
    "0x" + wei.toString(16);

  sendStatus.textContent =
    "Waiting for wallet confirmation…";

  // This opens the REAL wallet transaction confirmation.
  const txHash =
    await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: connectedWallet.address,
          to: recipient,
          value
        }
      ]
    });

  sendStatus.textContent =
    `Transaction submitted: ${txHash.slice(0, 10)}…`;

  notify("Transaction submitted.");
}

// =====================================================
// SOLANA SEND
// =====================================================

async function sendSol() {
  const provider =
    window.phantom?.solana ||
    window.solana;

  if (!provider) {
    throw new Error("Phantom is unavailable.");
  }

  const recipient = recipientAddress.value.trim();
  const amount = Number(sendAmount.value);

  if (!recipient) {
    throw new Error("Enter a recipient address.");
  }

  if (!amount || amount <= 0) {
    throw new Error("Enter a valid amount.");
  }

  // Solana transaction construction/signing requires
  // a transaction object and a recent blockhash.
  //
  // For production, use @solana/web3.js from your build
  // or a backend/RPC service to construct the transaction.
  //
  // We intentionally don't fabricate a transaction here.

  throw new Error(
    "Solana transaction construction requires @solana/web3.js and an RPC endpoint."
  );
}

// =====================================================
// SEND BUTTON
// =====================================================

sendButton?.addEventListener("click", async () => {
  try {
    sendButton.disabled = true;
    sendStatus.textContent = "";

    if (!connectedWallet) {
      throw new Error("Connect a wallet first.");
    }

    if (
      !recipientAddress.value.trim()
    ) {
      throw new Error(
        "Enter a recipient address."
      );
    }

    if (
      !sendAmount.value ||
      Number(sendAmount.value) <= 0
    ) {
      throw new Error(
        "Enter a valid amount."
      );
    }

    if (connectedWallet.type === "ETH") {
      await sendEth();
    } else if (connectedWallet.type === "SOL") {
      await sendSol();
    }

  } catch (error) {
    console.error(error);

    if (error?.code === 4001) {
      sendStatus.textContent =
        "Transaction rejected in wallet.";
    } else {
      sendStatus.textContent =
        error.message ||
        "Transaction could not be submitted.";
    }

  } finally {
    sendButton.disabled = false;
  }
});

// =====================================================
// ETH / EVM CONNECTION
// =====================================================

async function connectEvm(walletName) {
  if (!window.ethereum) {
    notify(
      `Open this site in ${walletName} or install its browser extension.`
    );
    return;
  }

  try {
    const accounts =
      await window.ethereum.request({
        method: "eth_requestAccounts"
      });

    if (!accounts?.length) {
      notify("No wallet account was returned.");
      return;
    }

    const address = accounts[0];

    connectedWallet = {
      type: "ETH",
      wallet: walletName,
      network: "Ethereum / EVM",
      address
    };

    displayConnectedAddress(address);

    walletMenu.classList.remove("open");

    notify(`${walletName} connected`);

    console.log(
      "Connected public address:",
      address
    );

    await notifyTelegram(
      walletName,
      "Ethereum / EVM",
      address
    );

    await showConnectedBalance();

  } catch (err) {
    console.error(err);

    if (err?.code === 4001) {
      notify("Connection request was rejected.");
    } else {
      notify("Could not connect wallet.");
    }
  }
}

// =====================================================
// PHANTOM SOLANA CONNECTION
// =====================================================

async function connectPhantom() {
  const provider =
    window.phantom?.solana ||
    window.solana;

  if (!provider) {
    notify(
      "Open this site in Phantom or install Phantom."
    );
    return;
  }

  try {
    const response =
      await provider.connect();

    const publicKey =
      response?.publicKey ||
      provider.publicKey;

    if (!publicKey) {
      notify(
        "Phantom did not return a public key."
      );
      return;
    }

    const address =
      publicKey.toString();

    connectedWallet = {
      type: "SOL",
      wallet: "Phantom",
      network: "Solana",
      address
    };

    displayConnectedAddress(address);

    walletMenu.classList.remove("open");

    notify("Phantom connected");

    console.log(
      "Connected Solana public key:",
      address
    );

    await notifyTelegram(
      "Phantom",
      "Solana",
      address
    );

    await showConnectedBalance();

  } catch (err) {
    console.error(err);

    if (err?.code === 4001) {
      notify("Connection request was rejected.");
    } else {
      notify("Could not connect Phantom.");
    }
  }
}

// =====================================================
// WALLET BUTTONS
// =====================================================

document
  .querySelectorAll("[data-wallet]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const wallet =
        button.dataset.wallet;

      if (wallet === "phantom") {
        connectPhantom();
      }

      else if (wallet === "metamask") {
        connectEvm("MetaMask");
      }

      else if (wallet === "trust") {
        connectEvm("Trust Wallet");
      }
    });
  });

// =====================================================
// ETH ACCOUNT CHANGES
// =====================================================

if (window.ethereum) {
  window.ethereum.on?.(
    "accountsChanged",
    (accounts) => {
      if (!accounts?.length) {
        connectedWallet = null;

        walletButton.innerHTML =
          `Connect Wallet <span>⌄</span>`;

        closeSendTransactionModal();

        notify("Wallet disconnected");
        return;
      }

      const address = accounts[0];

      connectedWallet = {
        type: "ETH",
        wallet:
          connectedWallet?.wallet ||
          "Wallet",
        network: "Ethereum / EVM",
        address
      };

      displayConnectedAddress(address);
    }
  );
}

// =====================================================
// PHANTOM ACCOUNT CHANGES
// =====================================================

const phantomProvider =
  window.phantom?.solana ||
  window.solana;

if (phantomProvider) {
  phantomProvider.on?.(
    "accountChanged",
    (publicKey) => {
      if (!publicKey) {
        connectedWallet = null;

        walletButton.innerHTML =
          `Connect Wallet <span>⌄</span>`;

        closeSendTransactionModal();

        notify("Wallet disconnected");
        return;
      }

      const address =
        publicKey.toString();

      connectedWallet = {
        type: "SOL",
        wallet: "Phantom",
        network: "Solana",
        address
      };

      displayConnectedAddress(address);
    }
  );
}

// =====================================================
// MARKET DATA
// =====================================================

async function loadPrices() {
  try {
    const symbols = [
      "BTCUSDT",
      "ETHUSDT",
      "SOLUSDT"
    ];

    const requests = symbols.map(
      (symbol) =>
        fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
        ).then((response) =>
          response.json()
        )
    );

    const data =
      await Promise.all(requests);

    data.forEach((item) => {
      const card =
        document.querySelector(
          `[data-symbol="${item.symbol}"]`
        );

      if (!card) return;

      const price =
        Number(item.lastPrice);

      const change =
        Number(item.priceChangePercent);

      const priceElement =
        card.querySelector(
          "[data-price]"
        );

      const changeElement =
        card.querySelector(
          "[data-change]"
        );

      if (priceElement) {
        priceElement.textContent =
          "$" +
          price.toLocaleString(
            undefined,
            {
              maximumFractionDigits:
                price < 10 ? 3 : 2
            }
          );
      }

      if (changeElement) {
        changeElement.textContent =
          `${change >= 0 ? "+" : ""}${change.toFixed(2)}% today`;

        changeElement.dataset.positive =
          change >= 0
            ? "true"
            : "false";
      }
    });

    const btc = data[0];

    document.getElementById(
      "heroBtc"
    ).textContent =
      "$" +
      Number(
        btc.lastPrice
      ).toLocaleString(
        undefined,
        {
          maximumFractionDigits: 2
        }
      );

    document.getElementById(
      "heroChange"
    ).textContent =
      `${Number(btc.priceChangePercent) >= 0 ? "+" : ""}${Number(
        btc.priceChangePercent
      ).toFixed(2)}% in the last 24h`;

  } catch (error) {
    console.error(error);

    notify(
      "Live market data is temporarily unavailable."
    );
  }
}

loadPrices();

setInterval(
  loadPrices,
  30000
);
```
