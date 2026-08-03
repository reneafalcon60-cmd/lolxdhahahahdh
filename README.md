# Marketly — Crypto dApp Landing Page

A simple sleek crypto markets/news front end with:
- Responsive layout
- Top navigation banner
- Animated Connect Wallet dropdown
- MetaMask, Trust Wallet, and Phantom connection buttons
- Public wallet address display after connection
- Live BTC/ETH/SOL market cards using Binance's public 24h ticker endpoint
- Crypto news/info sections

## Run locally

Because this is plain HTML/CSS/JS, you can use any static host.

For local development:
```bash
python3 -m http.server 8080
```
Then open http://localhost:8080

## Wallet behavior

The wallet buttons request `eth_requestAccounts` and only read the connected public address. This page does NOT request seed phrases, private keys, signatures, token approvals, or transactions.

MetaMask and Trust Wallet use the browser/mobile injected EVM provider. Phantom uses Phantom's EVM provider when available.

## Important before production

- Replace the placeholder news cards with a licensed news API/feed.
- Use your own backend for any private API keys.
- Add explicit network/chain handling if your dApp needs a specific chain.
- Never collect or ask users for seed phrases/private keys.
- Before deploying a real dApp, have the wallet connection and transaction logic reviewed for security.
