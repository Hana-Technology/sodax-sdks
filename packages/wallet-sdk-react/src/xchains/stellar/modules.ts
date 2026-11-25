import type { ModuleInterface } from '@creit.tech/stellar-wallets-kit';
import { chainRegistry } from '@/chainRegistry.js';
import { useXWalletStore } from '@/useXWalletStore.js';
import { StellarXService } from './StellarXService.js';
import { reconnectStellar } from './actions.js';

/** Re-runs Stellar connector discovery when STELLAR is enabled; otherwise init's own discovery picks the modules up. */
async function rediscoverStellarConnectors(): Promise<void> {
  const store = useXWalletStore.getState();
  const service = store.xServices.STELLAR;
  const discover = chainRegistry.STELLAR?.discoverConnectors;
  if (!service || !discover || !store.enabledChains.includes('STELLAR')) return;
  await discover(service, () => useXWalletStore.getState());
}

/**
 * Adds Stellar Wallets Kit modules after `SodaxWalletProvider` has mounted (for example a wallet whose availability
 * is only known at run time), then refreshes the Stellar connector list so they appear in `useXConnectors`.
 *
 * A module whose `productId` is already present is skipped; the list is refreshed either way, so calling this again
 * picks up a module that was not yet available the first time. Add a module once its `isAvailable()` can answer
 * `true` within the kit's 500 ms limit, or it is listed only after a later refresh.
 *
 * When the persisted Stellar connection belongs to a newly added module, it is restored as on mount.
 */
export async function addStellarWalletModules(modules: readonly ModuleInterface[]): Promise<void> {
  const added = StellarXService.getInstance().addModules(modules);

  const connection = useXWalletStore.getState().xConnections.STELLAR;
  const hydrated = useXWalletStore.persist?.hasHydrated() ?? true;
  if (hydrated && connection && added.includes(connection.xConnectorId)) {
    reconnectStellar().catch(error => console.warn('[wallet-sdk-react] Stellar reconnect failed:', error));
  }

  await rediscoverStellarConnectors();
}

/**
 * Removes Stellar Wallets Kit modules by `productId` and refreshes the Stellar connector list, so they disappear from
 * `useXConnectors`. When the Stellar connection uses a removed module, the connection is cleared; the module's own
 * session is left to its owner (call the wallet's own sign-out if it has one).
 */
export async function removeStellarWalletModules(productIds: readonly string[]): Promise<void> {
  const removed = StellarXService.getInstance().removeModules(productIds);

  const store = useXWalletStore.getState();
  const connection = store.xConnections.STELLAR;
  if (connection && removed.includes(connection.xConnectorId)) {
    store.unsetXConnection('STELLAR');
  }

  await rediscoverStellarConnectors();
}
