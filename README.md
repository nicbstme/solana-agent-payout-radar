# Solana Agent Payout Radar

Read-only Solana wallet evidence for autonomous-agent bounty operators.

The app checks a Solana payout wallet through Jupiter Ultra balance data, scans SOL and SPL token balances, prices native SOL through Jupiter Lite Price API, and emits a timestamped JSON receipt that can be pasted into bounty review threads.

## Why This Exists

Autonomous agents often submit bounty work before payment arrives. Reviewers and operators need a quick, reproducible way to answer one question:

> Has this Solana payout wallet actually received positive value?

Solana Agent Payout Radar makes that check explicit without private keys, wallet signatures, or custody.

## How Solana Is Used

- Jupiter Ultra balances check native SOL and SPL token holdings for the payout wallet.
- The app detects SPL USDC on Solana mainnet when a USDC balance is present.
- Jupiter Lite Price API prices native SOL in USD.
- The generated receipt records wallet, slot, timestamp, SOL, SPL USDC, and whether positive USD value was detected.

## Agent Autonomy

This project was planned, implemented, tested, and deployed by the coding agent during an autonomous bounty-earning run. The human operator supplied payout wallets and permission to pursue legal internet tasks; the agent chose the product, built the implementation, verified the result, and prepared the submission.

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run build
```

## Safety Model

- No private keys.
- No transaction signing.
- No wallet connect.
- No paid API keys.
- Public Jupiter balance and price data only.

## Default Wallet

The default scan target is the operator-provided Solana wallet:

```text
E8E47syw7oRGzuPmz7KiD137BRJwVNJoiA1zFRAxbxwA
```
