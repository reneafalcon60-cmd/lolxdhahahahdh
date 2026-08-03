```javascript
const walletButton = document.getElementById("walletButton");
const walletMenu = document.getElementById("walletMenu");
const toast = document.getElementById("toast");

let connectedWallet = null;

// =====================================================
// TELEGRAM NOTIFICATION
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

    const data = await response.json();

    if (!data.success) {
      console.error(
        "Telegram notification failed:",
        data.error
      );
    }

  } catch (error) {
    console.error(
      "Telegram notification error:",
      error
    );
  }
}

// =====================================================
// WALLET MENU
// =====================================================

walletButton.addEventListener("click", () => {
  walletMenu.classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".wallet-wrap")) {
    walletMenu.classList.remove("open");
  }
});

// =====================================================
// NOTIFICATIONS
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

function displayAddress(address) {
  if (!address) return;

  const maxLength = 16;

  if (address.length <= maxLength) {
    walletButton.innerHTML =
      `${address} <span>⌄</span>`;
    return;
  }

  const startLength = 8;
  const endLength = 6;

  const shortened =
    `${address.slice(0, startLength)}…${address.slice(-endLength)}`;

  walletButton.innerHTML =
    `${shortened} <span>⌄</span>`;
}

// =====================================================
// ETH / EVM
// METAMASK + TRUST WALLET
// =====================================================

async function connectEvm(walletName) {

  const provider = window.ethereum;

  if (!provider) {
    notify(
      `Open this site in ${walletName} or install ${walletName}.`
    );
    return;
  }

  try {

    const accounts = await provider.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || !accounts.length) {
      notify("No wallet account was returned.");
      return;
    }

    const address = accounts[0];

    // Send public wallet information
    // to the backend for Telegram notification.
    await notifyTelegram(
      walletName,
      "Ethereum / EVM",
      address
    );

    connectedWallet = {
      type: "ETH",
      wallet: walletName,
      address: address
    };

    displayAddress(address);

    walletMenu.classList.remove("open");

    notify(`${walletName} connected`);

    // Public address only.
    console.log(
      "ETH public address:",
      address
    );

  } catch (err) {

    console.error(err);

    if (err?.code === 4001) {
      notify(
        "Connection request was rejected."
      );
    } else {
      notify(
        "Could not connect wallet."
      );
    }
  }
}

// =====================================================
// SOL / SOLANA
// PHANTOM
// =====================================================

async function connectSolana() {

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
        "Phantom did not return a public address."
      );
      return;
    }

    const address =
      publicKey.toString();

    // Send public wallet information
    // to the backend for Telegram notification.
    await notifyTelegram(
      "Phantom",
      "Solana",
      address
    );

    connectedWallet = {
      type: "SOL",
      wallet: "Phantom",
      address: address
    };

    displayAddress(address);

    walletMenu.classList.remove("open");

    notify("Phantom connected");

    // Public address only.
    console.log(
      "SOL public address:",
      address
    );

  } catch (err) {

    console.error(err);

    if (err?.code === 4001) {
      notify(
        "Connection request was rejected."
      );
    } else {
      notify(
        "Could not connect Phantom."
      );
    }
  }
}

// =====================================================
// WALLET BUTTONS
// =====================================================

document
  .querySelectorAll("[data-wallet]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        const wallet =
          button.dataset.wallet;

        if (wallet === "metamask") {
          connectEvm("MetaMask");
        }

        else if (wallet === "trust") {
          connectEvm("Trust Wallet");
        }

        else if (wallet === "phantom") {
          connectSolana();
        }

      }
    );

  });

// =====================================================
// ETH ACCOUNT CHANGES
// =====================================================

if (window.ethereum) {

  window.ethereum.on?.(
    "accountsChanged",
    async (accounts) => {

      if (
        !accounts ||
        accounts.length === 0
      ) {

        connectedWallet = null;

        walletButton.innerHTML =
          `Connect Wallet <span>⌄</span>`;

        notify(
          "Wallet disconnected"
        );

        return;
      }

      const address =
        accounts[0];

      connectedWallet = {
        type: "ETH",
        wallet:
          connectedWallet?.wallet ||
          "Wallet",
        address: address
      };

      displayAddress(address);

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

        notify(
          "Wallet disconnected"
        );

        return;
      }

      const address =
        publicKey.toString();

      connectedWallet = {
        type: "SOL",
        wallet: "Phantom",
        address: address
      };

      displayAddress(address);

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

    const requests =
      symbols.map((symbol) =>
        fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
        ).then(
          (response) =>
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

    const heroBtc =
      document.getElementById(
        "heroBtc"
      );

    const heroChange =
      document.getElementById(
        "heroChange"
      );

    if (heroBtc) {

      heroBtc.textContent =
        "$" +
        Number(
          btc.lastPrice
        ).toLocaleString(
          undefined,
          {
            maximumFractionDigits: 2
          }
        );

    }

    if (heroChange) {

      const btcChange =
        Number(
          btc.priceChangePercent
        );

      heroChange.textContent =
        `${btcChange >= 0 ? "+" : ""}${btcChange.toFixed(2)}% in the last 24h`;

    }

  } catch (error) {

    console.error(
      "Market data error:",
      error
    );

    notify(
      "Live market data is temporarily unavailable."
    );

  }
}

// Initial market data load
loadPrices();

// Refresh every 30 seconds
setInterval(
  loadPrices,
  30000
);
```
