import { useQuery } from '@tanstack/react-query';
import { normalizeRelayUrl } from '@/lib/relay-utils';

const NOSTR_WATCH_API = 'https://api.nostr.watch/v1/online';

/** Number of top relays to suggest */
const TOP_RELAYS_COUNT = 10;

/**
 * Fetch top online relays from nostr.watch API
 */
export function useTopRelays(enabled: boolean = true) {
  return useQuery<string[]>({
    queryKey: ['topRelays'],
    queryFn: async ({ signal }) => {
      const response = await fetch(NOSTR_WATCH_API, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch relays: ${response.status}`);
      }

      const relays: string[] = await response.json();

      // Normalize and take top N relays
      return relays
        .slice(0, TOP_RELAYS_COUNT)
        .map(normalizeRelayUrl);
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    enabled,
  });
}
