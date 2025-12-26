import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

interface UserIdentityEvents {
  /** User's profile event (kind 0) */
  profileEvent: NostrEvent | null;
  /** User's contact list event (kind 3) */
  contactListEvent: NostrEvent | null;
}

/**
 * Fetch user's identity events (profile and contact list)
 * These events should be broadcast to all relays when switching relays
 * so the user's identity follows them to new relays.
 */
export function useUserIdentityEvents(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<UserIdentityEvents | null>({
    queryKey: ['userIdentityEvents', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return null;
      }

      // Fetch both kind 0 (profile) and kind 3 (contact list) in parallel
      const events = await nostr.query(
        [{ kinds: [0, 3], authors: [pubkey], limit: 2 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) }
      );

      const profileEvent = events.find(e => e.kind === 0) ?? null;
      const contactListEvent = events.find(e => e.kind === 3) ?? null;

      return {
        profileEvent,
        contactListEvent,
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    enabled: !!pubkey,
  });
}
