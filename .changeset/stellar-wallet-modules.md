---
"@sodax/wallet-sdk-react": minor
---

Let integrators offer extra Stellar Wallets Kit modules next to the built-in Stellar wallets.

- `config.STELLAR.modules` adds kit modules (any `ModuleInterface`) to the Stellar Wallets Kit that `StellarXService` builds with `allowAllModules()`. They appear in `useXConnectors({ xChainType: 'STELLAR' })` and connect, sign and reconnect like the built-in wallets. Until now the kit's module list was fixed, and a connector passed in `STELLAR.connectors` was replaced by the kit's discovery.
- `addStellarWalletModules` and `removeStellarWalletModules` (from `@sodax/wallet-sdk-react/xchains/stellar`) add or remove modules after `SodaxWalletProvider` has mounted and refresh the Stellar connector list. Until now Stellar discovery ran only at mount (at 0, 100 and 500 ms), so a wallet added later was never listed. A persisted Stellar connection that belongs to an added module is restored as on mount; removing a module clears a connection that used it.
- Stellar discovery runs are now ordered: when a newer run starts, an older one stops writing, so a slow scan can no longer replace a newer connector list.

Nothing changes for apps that pass no modules.
