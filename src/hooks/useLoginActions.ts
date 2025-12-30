import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';
import { NSecSigner } from '@nostrify/nostrify';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { useAppContext } from '@/hooks/useAppContext';

// NOTE: This file should not be edited except for adding new login methods.

const DEFAULT_RELAY = 'wss://relay.damus.io';

export interface NostrConnectParams {
  clientSecretKey: Uint8Array;
  clientPubkey: string;
  secret: string;
  relay: string;
}

/** Generate random parameters for a nostrconnect session. */
export function generateNostrConnectParams(relay: string): NostrConnectParams {
  const clientSecretKey = generateSecretKey();
  const clientPubkey = getPublicKey(clientSecretKey);
  const secret = crypto.randomUUID().slice(0, 8);

  return { clientSecretKey, clientPubkey, secret, relay };
}

/** Generate a nostrconnect:// URI from the params. */
export function generateNostrConnectURI(params: NostrConnectParams, appName: string): string {
  const { clientPubkey, secret, relay } = params;

  const url = new URL(`nostrconnect://${clientPubkey}`);
  url.searchParams.set('relay', relay);
  url.searchParams.set('secret', secret);
  url.searchParams.set('name', appName);

  // Add callback URL to redirect after signer authorization
  if (typeof window !== 'undefined') {
    url.searchParams.set('callback', `${window.location.origin}/remoteloginsuccess`);
  }

  return url.toString();
}

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();
  const { config } = useAppContext();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string): void {
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string): Promise<void> {
      const login = await NLogin.fromBunker(uri, nostr);
      addLogin(login);
    },
    // Login with a NIP-07 browser extension
    async extension(): Promise<void> {
      const login = await NLogin.fromExtension();
      addLogin(login);
    },
    // Login with NIP-46 nostrconnect (client-initiated)
    async nostrconnect(
      params: NostrConnectParams,
      signal?: AbortSignal
    ): Promise<void> {
      const { clientSecretKey, clientPubkey, secret, relay } = params;
      const clientSigner = new NSecSigner(clientSecretKey);

      // Subscribe to kind 24133 events p-tagged to our client pubkey
      const events = await nostr.req(
        [{ kinds: [24133], '#p': [clientPubkey], limit: 1 }],
        { signal }
      );

      for await (const msg of events) {
        if (msg[0] === 'EVENT') {
          const event = msg[2];
          const decrypted = await clientSigner.nip44.decrypt(event.pubkey, event.content);
          const response = JSON.parse(decrypted);

          // Validate the secret
          if (response.result === secret) {
            // Build bunker URI from the remote signer's response
            const bunkerUri = `bunker://${event.pubkey}?relay=${encodeURIComponent(relay)}&secret=${nip19.nsecEncode(clientSecretKey)}`;
            const login = await NLogin.fromBunker(bunkerUri, nostr);
            addLogin(login);
            return;
          }
        }
      }
    },
    // Get the current relay URL for nostrconnect
    getRelayUrl(): string {
      // Use first write relay from metadata, or fallback
      const writeRelay = config.relayMetadata?.relays?.find(r => r.write);
      return writeRelay?.url ?? DEFAULT_RELAY;
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        removeLogin(login.id);
      }
    }
  };
}
