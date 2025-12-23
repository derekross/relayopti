import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import type { RelayReview } from '@/types/relay-optimizer';
import { normalizeRelayUrl } from '@/lib/relay-utils';

/**
 * Kind 1986 - Relay Reviews
 *
 * Structure (inferred from common patterns):
 * - kind: 1986
 * - content: review text
 * - tags: [["r", "wss://relay.url"], ["rating", "5"]] (optional rating 1-5)
 */

/**
 * Fetch relay reviews for a specific relay
 */
export function useRelayReviews(relayUrl: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<RelayReview[]>({
    queryKey: ['relayReviews', relayUrl ?? ''],
    queryFn: async ({ signal }) => {
      if (!relayUrl) return [];

      const normalizedUrl = normalizeRelayUrl(relayUrl);

      // Query for relay reviews (kind 1986)
      const events = await nostr.query(
        [{ kinds: [1986], '#r': [relayUrl, normalizedUrl], limit: 50 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) }
      );

      // Parse reviews from events
      const reviews: RelayReview[] = events.map(event => {
        // Find rating tag if present
        const ratingTag = event.tags.find(([name]) => name === 'rating');
        const rating = ratingTag ? parseInt(ratingTag[1], 10) : undefined;

        // Find the relay URL tag
        const relayTag = event.tags.find(([name]) => name === 'r');
        const reviewRelayUrl = relayTag ? relayTag[1] : relayUrl;

        return {
          id: event.id,
          pubkey: event.pubkey,
          relayUrl: reviewRelayUrl,
          content: event.content,
          rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
          createdAt: event.created_at,
        };
      });

      // Sort by most recent first
      return reviews.sort((a, b) => b.createdAt - a.createdAt);
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    enabled: !!relayUrl,
  });
}

/**
 * Hook to publish a relay review
 */
export function usePublishRelayReview() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      relayUrl,
      content,
      rating,
    }: {
      relayUrl: string;
      content: string;
      rating?: number;
    }) => {
      if (!user) {
        throw new Error('User is not logged in');
      }

      const tags: string[][] = [['r', relayUrl]];

      // Add rating tag if provided
      if (rating && rating >= 1 && rating <= 5) {
        tags.push(['rating', rating.toString()]);
      }

      // Add client tag
      if (location.protocol === 'https:') {
        tags.push(['client', location.hostname]);
      }

      const event = await user.signer.signEvent({
        kind: 1986,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      return event;
    },
    onSuccess: (_data, variables) => {
      // Invalidate reviews cache for this relay
      queryClient.invalidateQueries({
        queryKey: ['relayReviews', variables.relayUrl],
      });
    },
    onError: (error) => {
      console.error('Failed to publish relay review:', error);
    },
  });
}

/**
 * Get average rating for a relay from reviews
 */
export function getAverageRating(reviews: RelayReview[]): number | null {
  const ratedReviews = reviews.filter(r => r.rating !== undefined);
  if (ratedReviews.length === 0) return null;

  const sum = ratedReviews.reduce((acc, r) => acc + (r.rating ?? 0), 0);
  return Math.round((sum / ratedReviews.length) * 10) / 10; // Round to 1 decimal
}
