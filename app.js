const walletButton = document.getElementById("walletButton");
const walletMenu = document.getElementById("walletMenu");
const toast = document.getElementById("toast");

walletButton.addEventListener("click", () => walletMenu.classList.toggle("open"));
document.addEventListener("click", e => {
  if (!e.target.closest(".wallet-wrap")) walletMenu.classList.remove("open");
});

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function shorten(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
}

async function connectEvm(walletName) {
  if (!window.ethereum) {
    notify(`Open this site in ${walletName} or install its browser extension.`);
    return;
  }

  try {
    // Connection only requests the public account address. No signing or transactions.
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const address = accounts[0];

    walletButton.innerHTML = `${shorten(address)} <span>⌄</span>`;
    walletMenu.classList.remove("open");
    notify(`${walletName} connected`);
    console.log("Connected public address:", address);
  } catch (err) {
    if (err?.code === 4001) notify("Connection request was rejected.");
    else notify("Could not connect wallet.");
  }
}

async function connectPhantom() {
  const provider = window.phantom?.ethereum || window.ethereum;
  if (!provider) {
    notify("Open this site in Phantom or install Phantom.");
    return;
  }
  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const address = accounts[0];
    walletButton.innerHTML = `${shorten(address)} <span>⌄</span>`;
    walletMenu.classList.remove("open");
    notify("Phantom connected");
    console.log("Connected public address:", address);
  } catch (err) {
    if (err?.code === 4001) notify("Connection request was rejected.");
    else notify("Could not connect Phantom.");
  }
}

document.querySelectorAll("[data-wallet]").forEach(button => {
  button.addEventListener("click", () => {
    const wallet = button.dataset.wallet;
    if (wallet === "phantom") connectPhantom();
    else if (wallet === "metamask") connectEvm("MetaMask");
    else if (wallet === "trust") connectEvm("Trust Wallet");
  });
});

async function loadPrices() {
  try {
    const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
    const requests = symbols.map(s => fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}`).then(r => r.json()));
    const data = await Promise.all(requests);

    data.forEach(item => {
      const card = document.querySelector(`[data-symbol="${item.symbol}"]`);
      if (!card) return;
      const price = Number(item.lastPrice);
      const change = Number(item.priceChangePercent);
      card.querySelector("[data-price]").textContent = "$" + price.toLocaleString(undefined, {maximumFractionDigits: price < 10 ? 3 : 2});
      const changeEl = card.querySelector("[data-change]");
      changeEl.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}% today`;
      changeEl.dataset.positive = change >= 0 ? "true" : "false";
    });

    const btc = data[0];
    document.getElementById("heroBtc").textContent = "$" + Number(btc.lastPrice).toLocaleString(undefined, {maximumFractionDigits: 2});
    document.getElementById("heroChange").textContent = `${Number(btc.priceChangePercent) >= 0 ? "+" : ""}${Number(btc.priceChangePercent).toFixed(2)}% in the last 24h`;
  } catch {
    notify("Live market data is temporarily unavailable.");
  }
}

loadPrices();
setInterval(loadPrices, 30000);
