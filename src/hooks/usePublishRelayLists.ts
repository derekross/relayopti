import { useNostr } from '@nostrify/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';
import type { PublishResult } from '@/types/relay-optimizer';
import { normalizeRelayUrl } from '@/lib/relay-utils';

/**
 * Transform cryptic relay errors into user-friendly messages
 */
function formatRelayError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Unknown error';

  // Handle the Promise.any failure when all relays reject
  if (msg.includes('no promise in promise.any was resolved') || msg.includes('All promises were rejected')) {
    return 'All relays failed to accept the event. Please check your relay configuration.';
  }

  return msg;
}

interface RelayListsToPublish {
  inboxRelays: string[];
  outboxRelays: string[];
  dmRelays: string[];
  searchRelays: string[];
  blockedRelays: string[];
  indexerRelays: string[];
  proxyRelays: string[];
  broadcastRelays: string[];
  trustedRelays: string[];
  /** User's profile event (kind 0) to broadcast to all relays */
  profileEvent?: NostrEvent | null;
  /** User's contact list event (kind 3) to broadcast to all relays */
  contactListEvent?: NostrEvent | null;
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
        blocked: false,
        indexer: false,
        proxy: false,
        broadcast: false,
        trusted: false,
        profile: false,
        contactList: false,
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
          results.errors.push(`NIP-65: ${formatRelayError(e)}`);
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
          results.errors.push(`DM relays: ${formatRelayError(e)}`);
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
          results.errors.push(`Search relays: ${formatRelayError(e)}`);
          console.error('Failed to publish search relays:', e);
        }
      }

      // Publish blocked relays (kind 10006)
      if (lists.blockedRelays.length > 0) {
        try {
          const tags = lists.blockedRelays.map(url => ['relay', url]);
          const event = await user.signer.signEvent({
            kind: 10006,
            content: '',
            tags: addClientTag(tags),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.blocked = true;
        } catch (e) {
          results.errors.push(`Blocked relays: ${formatRelayError(e)}`);
          console.error('Failed to publish blocked relays:', e);
        }
      }

      // Publish indexer relays (kind 10086)
      if (lists.indexerRelays.length > 0) {
        try {
          const tags = lists.indexerRelays.map(url => ['relay', url]);
          const event = await user.signer.signEvent({
            kind: 10086,
            content: '',
            tags: addClientTag(tags),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.indexer = true;
        } catch (e) {
          results.errors.push(`Indexer relays: ${formatRelayError(e)}`);
          console.error('Failed to publish indexer relays:', e);
        }
      }

      // Publish proxy relays (kind 10087)
      if (lists.proxyRelays.length > 0) {
        try {
          const tags = lists.proxyRelays.map(url => ['relay', url]);
          const event = await user.signer.signEvent({
            kind: 10087,
            content: '',
            tags: addClientTag(tags),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.proxy = true;
        } catch (e) {
          results.errors.push(`Proxy relays: ${formatRelayError(e)}`);
          console.error('Failed to publish proxy relays:', e);
        }
      }

      // Publish broadcast relays (kind 10088)
      if (lists.broadcastRelays.length > 0) {
        try {
          const tags = lists.broadcastRelays.map(url => ['relay', url]);
          const event = await user.signer.signEvent({
            kind: 10088,
            content: '',
            tags: addClientTag(tags),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.broadcast = true;
        } catch (e) {
          results.errors.push(`Broadcast relays: ${formatRelayError(e)}`);
          console.error('Failed to publish broadcast relays:', e);
        }
      }

      // Publish trusted relays (kind 10089)
      if (lists.trustedRelays.length > 0) {
        try {
          const tags = lists.trustedRelays.map(url => ['relay', url]);
          const event = await user.signer.signEvent({
            kind: 10089,
            content: '',
            tags: addClientTag(tags),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.trusted = true;
        } catch (e) {
          results.errors.push(`Trusted relays: ${formatRelayError(e)}`);
          console.error('Failed to publish trusted relays:', e);
        }
      }

      // Broadcast profile (kind 0) to all relays
      // This ensures the user's identity follows them to new relays
      if (lists.profileEvent) {
        try {
          // Re-sign the profile event with a new timestamp to broadcast it
          const event = await user.signer.signEvent({
            kind: 0,
            content: lists.profileEvent.content,
            tags: addClientTag(lists.profileEvent.tags.filter(([name]) => name !== 'client')),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.profile = true;
        } catch (e) {
          results.errors.push(`Profile: ${formatRelayError(e)}`);
          console.error('Failed to broadcast profile:', e);
        }
      }

      // Broadcast contact list (kind 3) to all relays
      // This ensures the user's social graph follows them to new relays
      if (lists.contactListEvent) {
        try {
          // Re-sign the contact list event with a new timestamp to broadcast it
          const event = await user.signer.signEvent({
            kind: 3,
            content: lists.contactListEvent.content,
            tags: addClientTag(lists.contactListEvent.tags.filter(([name]) => name !== 'client')),
            created_at: Math.floor(Date.now() / 1000),
          });

          await nostr.event(event, { signal: AbortSignal.timeout(10000) });
          results.contactList = true;
        } catch (e) {
          results.errors.push(`Contact list: ${formatRelayError(e)}`);
          console.error('Failed to broadcast contact list:', e);
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
      if (result.blocked) successParts.push('blocked');
      if (result.indexer) successParts.push('indexer');
      if (result.proxy) successParts.push('proxy');
      if (result.broadcast) successParts.push('broadcast');
      if (result.trusted) successParts.push('trusted');

      // Track identity broadcasts separately
      const identityParts: string[] = [];
      if (result.profile) identityParts.push('profile');
      if (result.contactList) identityParts.push('contact list');

      if (successParts.length > 0 || identityParts.length > 0) {
        let description = '';
        if (successParts.length > 0) {
          description = `Updated your ${successParts.join(', ')} relays.`;
        }
        if (identityParts.length > 0) {
          description += description ? ' ' : '';
          description += `Your ${identityParts.join(' and ')} ${identityParts.length > 1 ? 'were' : 'was'} synced to all relays.`;
        }
        toast({
          title: 'Published successfully!',
          description,
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
