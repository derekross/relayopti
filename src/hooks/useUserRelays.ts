import { useNostr } from '@nostrify/react';
import { NRelay1 } from '@nostrify/nostrify';
import { useQuery } from '@tanstack/react-query';
import type { UserRelayLists, NIP65Relay } from '@/types/relay-optimizer';
import { normalizeRelayUrl } from '@/lib/relay-utils';

/** Default search relays for users who don't have any configured */
export const DEFAULT_SEARCH_RELAYS = [
  'wss://nostr.wine',
  'wss://search.nos.today',
  'wss://relay.noswhere.com',
];

/** Default DM relays for users who don't have any configured */
export const DEFAULT_DM_RELAYS = [
  'wss://auth.nostr1.com',      // Free
  'wss://relay.0xchat.com',     // Free
  'wss://inbox.nostr.wine',     // Paid
];

/** Default indexer relays for users who don't have any configured */
export const DEFAULT_INDEXER_RELAYS = [
  'wss://user.kindpag.es',
  'wss://indexer.coracle.social',
  'wss://purplepag.es',
];

/** Default broadcast relays for users who don't have any configured */
export const DEFAULT_BROADCAST_RELAYS = [
  'wss://sendit.nosflare.com',
];

/** All relay-related event kinds */
const RELAY_KINDS = [
  10002, // NIP-65 inbox/outbox
  10050, // DM relays
  10007, // Search relays
  10006, // Blocked relays
  10086, // Indexer relays
  10087, // Proxy relays
  10088, // Broadcast relays
  10089, // Trusted relays
];

/**
 * Fetch all relay lists for a user
 * - Kind 10002: NIP-65 inbox/outbox relays
 * - Kind 10050: DM relays
 * - Kind 10007: Search relays
 * - Kind 10006: Blocked relays
 * - Kind 10086: Indexer relays
 * - Kind 10087: Proxy relays
 * - Kind 10088: Broadcast relays
 * - Kind 10089: Trusted relays
 */
export function useUserRelays(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<UserRelayLists | null>({
    queryKey: ['userRelays', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return null;
      }

      // Fetch all relay-related events at once from main pool
      const events = await nostr.query(
        [{ kinds: RELAY_KINDS, authors: [pubkey], limit: 20 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) }
      );

      // Also try purplepag.es for better coverage of these replaceable events
      let purplepagesEvents: typeof events = [];
      try {
        const purplepages = new NRelay1('wss://purplepag.es');
        purplepagesEvents = await purplepages.query(
          [{ kinds: RELAY_KINDS, authors: [pubkey], limit: 20 }],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
        );
        purplepages.close();
      } catch {
        // purplepag.es unavailable, continue with main pool results
      }

      // Merge events, keeping only the most recent of each kind
      const allEvents = [...events, ...purplepagesEvents];

      // Helper to get most recent event of a kind
      const getLatestOfKind = (kind: number) =>
        allEvents
          .filter(e => e.kind === kind)
          .sort((a, b) => b.created_at - a.created_at)[0];

      // Find the most recent event of each kind
      const nip65Event = getLatestOfKind(10002);
      const dmEvent = getLatestOfKind(10050);
      const searchEvent = getLatestOfKind(10007);
      const blockedEvent = getLatestOfKind(10006);
      const indexerEvent = getLatestOfKind(10086);
      const proxyEvent = getLatestOfKind(10087);
      const broadcastEvent = getLatestOfKind(10088);
      const trustedEvent = getLatestOfKind(10089);

      // Helper to parse relay tags
      const parseRelayTags = (event: typeof nip65Event): string[] =>
        event
          ? event.tags
              .filter(([name]) => name === 'relay')
              .map(([, url]) => normalizeRelayUrl(url))
          : [];

      // Parse NIP-65 relays (kind 10002) - uses 'r' tags
      const nip65: NIP65Relay[] = nip65Event
        ? nip65Event.tags
            .filter(([name]) => name === 'r')
            .map(([, url, marker]) => ({
              url: normalizeRelayUrl(url),
              read: !marker || marker === 'read',
              write: !marker || marker === 'write',
            }))
        : [];

      return {
        nip65,
        dmRelays: parseRelayTags(dmEvent),
        searchRelays: parseRelayTags(searchEvent),
        blockedRelays: parseRelayTags(blockedEvent),
        indexerRelays: parseRelayTags(indexerEvent),
        proxyRelays: parseRelayTags(proxyEvent),
        broadcastRelays: parseRelayTags(broadcastEvent),
        trustedRelays: parseRelayTags(trustedEvent),
        fetchedAt: Date.now(),
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    enabled: !!pubkey,
  });
}

/**
 * Extract inbox (read) relays from NIP-65 list
 */
export function getInboxRelays(nip65: NIP65Relay[]): string[] {
  return nip65.filter(r => r.read).map(r => r.url);
}

/**
 * Extract outbox (write) relays from NIP-65 list
 */
export function getOutboxRelays(nip65: NIP65Relay[]): string[] {
  return nip65.filter(r => r.write).map(r => r.url);
}
