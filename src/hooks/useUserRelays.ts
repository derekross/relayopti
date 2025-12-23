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

/**
 * Fetch all relay lists for a user
 * - Kind 10002: NIP-65 inbox/outbox relays
 * - Kind 10050: DM relays
 * - Kind 10007: Search relays
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
        [{ kinds: [10002, 10050, 10007], authors: [pubkey], limit: 10 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) }
      );

      // Also try purplepag.es for better coverage of these replaceable events
      let purplepagesEvents: typeof events = [];
      try {
        const purplepages = new NRelay1('wss://purplepag.es');
        purplepagesEvents = await purplepages.query(
          [{ kinds: [10002, 10050, 10007], authors: [pubkey], limit: 10 }],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
        );
        purplepages.close();
      } catch {
        // purplepag.es unavailable, continue with main pool results
      }

      // Merge events, keeping only the most recent of each kind
      const allEvents = [...events, ...purplepagesEvents];

      // Find the most recent event of each kind
      const nip65Event = allEvents
        .filter(e => e.kind === 10002)
        .sort((a, b) => b.created_at - a.created_at)[0];

      const dmEvent = allEvents
        .filter(e => e.kind === 10050)
        .sort((a, b) => b.created_at - a.created_at)[0];

      const searchEvent = allEvents
        .filter(e => e.kind === 10007)
        .sort((a, b) => b.created_at - a.created_at)[0];

      // Log for debugging
      console.log('Fetched relay events:', {
        nip65: nip65Event ? `found (${nip65Event.tags.length} tags)` : 'not found',
        dm: dmEvent ? `found (${dmEvent.tags.length} tags)` : 'not found',
        search: searchEvent ? `found (${searchEvent.tags.length} tags)` : 'not found',
        searchTags: searchEvent?.tags,
      });

      // Parse NIP-65 relays (kind 10002)
      const nip65: NIP65Relay[] = nip65Event
        ? nip65Event.tags
            .filter(([name]) => name === 'r')
            .map(([, url, marker]) => ({
              url: normalizeRelayUrl(url),
              read: !marker || marker === 'read',
              write: !marker || marker === 'write',
            }))
        : [];

      // Parse DM relays (kind 10050)
      const dmRelays: string[] = dmEvent
        ? dmEvent.tags
            .filter(([name]) => name === 'relay')
            .map(([, url]) => normalizeRelayUrl(url))
        : [];

      // Parse search relays (kind 10007)
      const searchRelays: string[] = searchEvent
        ? searchEvent.tags
            .filter(([name]) => name === 'relay')
            .map(([, url]) => normalizeRelayUrl(url))
        : [];

      return {
        nip65,
        dmRelays,
        searchRelays,
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
