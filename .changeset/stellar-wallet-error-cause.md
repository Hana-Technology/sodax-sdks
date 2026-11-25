---
"@sodax/wallet-sdk-core": patch
---

Keep the wallet's own error on `StellarWalletError.cause` when a Stellar Wallets Kit call fails in `StellarWalletProvider.getWalletAddress` or `signTransaction`.

Stellar Wallets Kit modules reject with a plain `{ code, message, ext? }` object rather than an `Error`, so the provider reported only "Failed to sign transaction" (or "Failed to get wallet address") and the wallet's code — `4001` for a user rejection, or a wallet-specific reason — was lost. The thrown value is now attached as `cause`; `message` and `code` are unchanged, so existing callers see the same error as before.
