import { useNostr } from '@nostrify/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';
import type { PublishResult } from '@/types/relay-optimizer';
import { normalizeRelayUrl } from '@/lib/relay-utils';

interface RelayListsToPublish {
  inboxRelays: string[];
  outboxRelays: string[];
  dmRelays: string[];
  searchRelays: string[];
}

/**
 * Build NIP-65 tags from inbox/outbox relay lists
 */
function buildNIP65Tags(inbox: string[], outbox: string[]): string[][] {
  const tags: string[][] = [];
  const seen = new Set<string>();

  // Create set of outbox relays for lookup
  const outboxSet = new Set(outbox.map(normalizeRelayUrl));

  for (const url of inbox) {
    const normalized = normalizeRelayUrl(url);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    if (outboxSet.has(normalized)) {
      // Both read and write - no marker
      tags.push(['r', url]);
    } else {
      // Read only
      tags.push(['r', url, 'read']);
    }
  }

  for (const url of outbox) {
    const normalized = normalizeRelayUrl(url);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    // Write only (already handled "both" case above)
    tags.push(['r', url, 'write']);
  }

  return tags;
}

/**
 * Hook to publish all relay lists to Nostr
 */
export function usePublishRelayLists() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lists: RelayListsToPublish): Promise<PublishResult> => {
      if (!user) {
        throw new Error('User is not logged in');
      }

      const results: PublishResult = {
        nip65: false,
        dm: false,
        search: false,
        errors: [],
      };

      // Helper to add client tag
      const addClientTag = (tags: string[][]): string[][] => {
        if (location.protocol === 'https:') {
          return [...tags, ['client', location.hostname]];
        }
        return tags;
      };

      // Publish NIP-65 (kind 10002)
      if (lists.inboxRelays.length > 0 || lists.outboxRelays.length > 0) {
        try {
          const tags = buildNIP65Tags(lists.inboxRelays, lists.outboxRelays);
          const event = await user.signer.signEvent({
            kind: 10002,
            content: '',
            tags: addClientTag(tags),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.nip65 = true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          results.errors.push(`NIP-65: ${msg}`);
          console.error('Failed to publish NIP-65:', e);
        }
      }

      // Publish DM relays (kind 10050)
      if (lists.dmRelays.length > 0) {
        try {
          const tags = lists.dmRelays.map(url => ['relay', url]);
          const event = await user.signer.signEvent({
            kind: 10050,
            content: '',
            tags: addClientTag(tags),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.dm = true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          results.errors.push(`DM relays: ${msg}`);
          console.error('Failed to publish DM relays:', e);
        }
      }

      // Publish search relays (kind 10007)
      if (lists.searchRelays.length > 0) {
        try {
          const tags = lists.searchRelays.map(url => ['relay', url]);
          const event = await user.signer.signEvent({
            kind: 10007,
            content: '',
            tags: addClientTag(tags),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.search = true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          results.errors.push(`Search relays: ${msg}`);
          console.error('Failed to publish search relays:', e);
        }
      }

      return results;
    },
    onSuccess: (result) => {
      // Invalidate relay queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['userRelays'] });

      // Show success toast
      const successParts: string[] = [];
      if (result.nip65) successParts.push('inbox/outbox');
      if (result.dm) successParts.push('DM');
      if (result.search) successParts.push('search');

      if (successParts.length > 0) {
        toast({
          title: 'Relay lists published!',
          description: `Updated your ${successParts.join(', ')} relays.`,
        });
      }

      if (result.errors.length > 0) {
        toast({
          title: 'Some updates failed',
          description: result.errors.join('\n'),
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to publish',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
