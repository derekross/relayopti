import { useNostr } from '@nostrify/react';
import { NRelay1 } from '@nostrify/nostrify';
import { useQuery } from '@tanstack/react-query';
import type { RelaySuggestion, ContactRelayInfo } from '@/types/relay-optimizer';
import { normalizeRelayUrl, isSameRelay } from '@/lib/relay-utils';

/** Relays that index NIP-65 data, in order of preference */
const NIP65_RELAYS = [
  'wss://purplepag.es',
  'wss://indexer.coracle.social',
  'wss://user.kindpag.es',
];

interface ContactRelaysResult {
  suggestions: RelaySuggestion[];
  contactCount: number;
  analyzedCount: number;
}

/**
 * Fetch contacts and analyze their relay usage
 * - Fetches user's kind 3 contact list
 * - Queries purplepag.es for contacts' NIP-65 events (kind 10002)
 * - Also checks kind 0 profiles for legacy relay fields
 * - Aggregates and ranks relays by popularity
 */
export function useContactRelays(
  pubkey: string | undefined,
  userRelays: string[] = []
) {
  const { nostr } = useNostr();

  return useQuery<ContactRelaysResult | null>({
    queryKey: ['contactRelays', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) return null;

      // Step 1: Fetch user's contact list (kind 3)
      const contactEvents = await nostr.query(
        [{ kinds: [3], authors: [pubkey], limit: 1 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) }
      );

      const contactListEvent = contactEvents[0];
      if (!contactListEvent) {
        return { suggestions: [], contactCount: 0, analyzedCount: 0 };
      }

      const contactPubkeys = contactListEvent.tags
        .filter(([name]) => name === 'p')
        .map(([, pk]) => pk)
        .filter(Boolean);

      if (contactPubkeys.length === 0) {
        return { suggestions: [], contactCount: 0, analyzedCount: 0 };
      }

      // Step 2: Query for contacts' NIP-65 events
      // Batch into chunks to avoid overwhelming relays
      const BATCH_SIZE = 100;
      const relayUsage = new Map<string, Set<string>>(); // relay -> set of pubkeys
      const contactInfo = new Map<string, ContactRelayInfo>();

      console.log(`[ContactRelays] Querying ${contactPubkeys.length} contacts in ${Math.ceil(contactPubkeys.length / BATCH_SIZE)} batches...`);

      // Find a working relay from the list
      let workingRelay: NRelay1 | null = null;

      for (const relayUrl of NIP65_RELAYS) {
        try {
          console.log(`[ContactRelays] Trying ${relayUrl}...`);
          const relay = new NRelay1(relayUrl);
          const testEvents = await relay.query(
            [{ kinds: [10002], limit: 1 }],
            { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
          );
          if (testEvents.length > 0) {
            console.log(`[ContactRelays] Using ${relayUrl}`);
            workingRelay = relay;
            break;
          } else {
            console.log(`[ContactRelays] ${relayUrl} returned no data, trying next...`);
            relay.close();
          }
        } catch (err) {
          console.log(`[ContactRelays] ${relayUrl} failed:`, err);
        }
      }

      if (!workingRelay) {
        console.log('[ContactRelays] No indexer relay available, falling back to main pool');
      }

      try {
        // Fetch NIP-65 events in batches
        for (let i = 0; i < contactPubkeys.length; i += BATCH_SIZE) {
          const batch = contactPubkeys.slice(i, i + BATCH_SIZE);

          let nip65Events: typeof contactEvents = [];
          try {
            if (workingRelay) {
              nip65Events = await workingRelay.query(
                [{ kinds: [10002], authors: batch }],
                { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }
              );
            } else {
              nip65Events = await nostr.query(
                [{ kinds: [10002], authors: batch }],
                { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }
              );
            }
            console.log(`[ContactRelays] Batch ${i / BATCH_SIZE + 1}: Got ${nip65Events.length} NIP-65 events`);
          } catch (err) {
            console.error(`[ContactRelays] Batch ${i / BATCH_SIZE + 1} failed:`, err);
            continue;
          }

          // Process NIP-65 events
          for (const event of nip65Events) {
            const relays = event.tags
              .filter(([n]) => n === 'r')
              .map(([, url]) => normalizeRelayUrl(url));

            for (const relay of relays) {
              if (!relayUsage.has(relay)) {
                relayUsage.set(relay, new Set());
              }
              relayUsage.get(relay)!.add(event.pubkey);
            }

            // Store contact info
            if (!contactInfo.has(event.pubkey)) {
              contactInfo.set(event.pubkey, {
                pubkey: event.pubkey,
                relays,
                source: 'nip65',
              });
            }
          }
        }
      } catch (err) {
        console.error('[ContactRelays] Error querying NIP-65:', err);
      } finally {
        workingRelay?.close();
      }

      console.log(`[ContactRelays] Analysis complete: ${contactInfo.size} contacts analyzed, ${relayUsage.size} unique relays found`);

      // Step 4: Convert to sorted suggestions
      const userRelaySet = new Set(userRelays.map(normalizeRelayUrl));

      const suggestions: RelaySuggestion[] = Array.from(relayUsage.entries())
        .map(([url, pubkeys]) => {
          const contacts: ContactRelayInfo[] = Array.from(pubkeys)
            .map(pk => contactInfo.get(pk))
            .filter((info): info is ContactRelayInfo => info !== undefined);

          // Determine source based on contacts
          const hasNip65 = contacts.some(c => c.source === 'nip65' || c.source === 'both');
          const hasProfile = contacts.some(c => c.source === 'profile' || c.source === 'both');
          const source: 'nip65' | 'profile' | 'both' =
            hasNip65 && hasProfile ? 'both' : hasNip65 ? 'nip65' : 'profile';

          return {
            url,
            contactCount: pubkeys.size,
            contacts,
            source,
            alreadyUsed: Array.from(userRelaySet).some(userRelay => isSameRelay(userRelay, url)),
          };
        })
        .sort((a, b) => b.contactCount - a.contactCount);

      return {
        suggestions,
        contactCount: contactPubkeys.length,
        analyzedCount: contactInfo.size,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!pubkey,
    retry: 2,
  });
}
