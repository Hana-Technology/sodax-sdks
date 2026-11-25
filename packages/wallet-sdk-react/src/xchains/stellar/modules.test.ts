import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModuleType, type ModuleInterface } from '@creit.tech/stellar-wallets-kit';
import { useXWalletStore } from '@/useXWalletStore.js';
import { StellarXService } from './StellarXService.js';
import { addStellarWalletModules, removeStellarWalletModules } from './modules.js';

const ADDRESS = 'GBLATEWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

const fakeModule = (productId: string, available = true): ModuleInterface => ({
  moduleType: ModuleType.HOT_WALLET,
  productId,
  productName: `Wallet ${productId}`,
  productUrl: 'https://wallet.example',
  productIcon: 'data:image/svg+xml,',
  isAvailable: async () => available,
  getAddress: vi.fn().mockResolvedValue({ address: ADDRESS }),
  signTransaction: vi.fn(),
  signAuthEntry: vi.fn(),
  signMessage: vi.fn(),
  getNetwork: vi.fn(),
});

const stellarConnectorIds = () => (useXWalletStore.getState().xConnectorsByChain.STELLAR ?? []).map(c => c.id);

// The XService singleton and the store are module-level state — start every test from a mounted STELLAR slot
// whose own discovery has already run (as after mount), so only the calls under test write the connector list.
beforeEach(() => {
  (StellarXService as unknown as { instance?: unknown }).instance = undefined;
  useXWalletStore.setState({
    xServices: { STELLAR: StellarXService.getInstance() },
    enabledChains: ['STELLAR'],
    xConnectorsByChain: {},
    xConnections: {},
  });
});

afterEach(() => {
  useXWalletStore.getState().unsetXConnection('STELLAR');
  vi.restoreAllMocks();
});

describe('addStellarWalletModules', () => {
  it('lists a module added after mount in the Stellar connectors', async () => {
    await addStellarWalletModules([fakeModule('late-wallet')]);

    expect(stellarConnectorIds()).toContain('late-wallet');
  });

  it('lists a module that was unavailable when added once a later call finds it available', async () => {
    let available = false;
    const mod = { ...fakeModule('late-wallet'), isAvailable: async () => available };

    await addStellarWalletModules([mod]);
    expect(stellarConnectorIds()).not.toContain('late-wallet');

    available = true;
    await addStellarWalletModules([mod]);
    expect(stellarConnectorIds()).toContain('late-wallet');
  });

  it('restores a persisted Stellar connection that belongs to the added module', async () => {
    useXWalletStore.setState({
      xConnections: {
        STELLAR: { xAccount: { address: ADDRESS, xChainType: 'STELLAR' }, xConnectorId: 'late-wallet' },
      },
    });
    const mod = fakeModule('late-wallet');

    await addStellarWalletModules([mod]);

    await vi.waitFor(() => expect(mod.getAddress).toHaveBeenCalledTimes(1));
    await expect(StellarXService.getInstance().walletsKit.getAddress()).resolves.toEqual({ address: ADDRESS });
  });

  it('only adds the modules when STELLAR is not enabled, leaving discovery to init', async () => {
    useXWalletStore.setState({ xServices: {}, enabledChains: [] });

    await addStellarWalletModules([fakeModule('late-wallet')]);

    expect(stellarConnectorIds()).toEqual([]);
    const ids = (await StellarXService.getInstance().walletsKit.getSupportedWallets()).map(w => w.id);
    expect(ids).toContain('late-wallet');
  });
});

describe('removeStellarWalletModules', () => {
  it('drops the module from the Stellar connectors and clears a connection that used it', async () => {
    await addStellarWalletModules([fakeModule('late-wallet')]);
    useXWalletStore.getState().setXConnection('STELLAR', {
      xAccount: { address: ADDRESS, xChainType: 'STELLAR' },
      xConnectorId: 'late-wallet',
    });

    await removeStellarWalletModules(['late-wallet']);

    expect(stellarConnectorIds()).not.toContain('late-wallet');
    expect(useXWalletStore.getState().xConnections.STELLAR).toBeUndefined();
  });

  it('keeps a connection that uses another wallet', async () => {
    await addStellarWalletModules([fakeModule('late-wallet'), fakeModule('other-wallet')]);
    useXWalletStore.getState().setXConnection('STELLAR', {
      xAccount: { address: ADDRESS, xChainType: 'STELLAR' },
      xConnectorId: 'other-wallet',
    });

    await removeStellarWalletModules(['late-wallet']);

    expect(stellarConnectorIds()).toContain('other-wallet');
    expect(useXWalletStore.getState().xConnections.STELLAR?.xConnectorId).toBe('other-wallet');
  });
});
