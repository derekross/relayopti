import { useNostr } from '@nostrify/react';
import { NRelay1 } from '@nostrify/nostrify';
import { useQuery } from '@tanstack/react-query';
import type { RelaySuggestion, ContactRelayInfo } from '@/types/relay-optimizer';
import { normalizeRelayUrl, isSameRelay } from '@/lib/relay-utils';

const PURPLEPAGES_URL = 'wss://purplepag.es';

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

      // Step 2: Query purplepag.es for contacts' NIP-65 events
      // Batch into chunks to avoid overwhelming the relay
      const BATCH_SIZE = 100;
      const relayUsage = new Map<string, Set<string>>(); // relay -> set of pubkeys
      const contactInfo = new Map<string, ContactRelayInfo>();

      let purplepages: NRelay1 | null = null;
      try {
        purplepages = new NRelay1(PURPLEPAGES_URL);

        // Fetch NIP-65 events in batches
        for (let i = 0; i < contactPubkeys.length; i += BATCH_SIZE) {
          const batch = contactPubkeys.slice(i, i + BATCH_SIZE);

          const nip65Events = await purplepages.query(
            [{ kinds: [10002], authors: batch }],
            { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }
          );

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

        // Step 3: Also fetch kind 0 profiles for display names and legacy relays
        for (let i = 0; i < contactPubkeys.length; i += BATCH_SIZE) {
          const batch = contactPubkeys.slice(i, i + BATCH_SIZE);

          try {
            const profileEvents = await purplepages.query(
              [{ kinds: [0], authors: batch }],
              { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) }
            );

            for (const event of profileEvents) {
              try {
                const metadata = JSON.parse(event.content) as {
                  name?: string;
                  display_name?: string;
                  picture?: string;
                  relay?: string;
                  relays?: string[];
                };

                // Update contact info with display name
                const existing = contactInfo.get(event.pubkey);
                if (existing) {
                  existing.displayName = metadata.display_name || metadata.name;
                  existing.picture = metadata.picture;
                }

                // Check for legacy relay field
                const legacyRelays: string[] = [];
                if (metadata.relay) {
                  legacyRelays.push(normalizeRelayUrl(metadata.relay));
                }
                if (Array.isArray(metadata.relays)) {
                  legacyRelays.push(...metadata.relays.map(normalizeRelayUrl));
                }

                for (const relay of legacyRelays) {
                  if (!relayUsage.has(relay)) {
                    relayUsage.set(relay, new Set());
                  }
                  relayUsage.get(relay)!.add(event.pubkey);

                  // Update source to 'both' if already have NIP-65
                  const info = contactInfo.get(event.pubkey);
                  if (info && info.source === 'nip65') {
                    info.source = 'both';
                  } else if (!info) {
                    contactInfo.set(event.pubkey, {
                      pubkey: event.pubkey,
                      displayName: metadata.display_name || metadata.name,
                      picture: metadata.picture,
                      relays: legacyRelays,
                      source: 'profile',
                    });
                  }
                }
              } catch {
                // Failed to parse profile JSON
              }
            }
          } catch {
            // Failed to fetch profiles, continue without them
          }
        }
      } finally {
        // Clean up the relay connection
        purplepages?.close();
      }

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
