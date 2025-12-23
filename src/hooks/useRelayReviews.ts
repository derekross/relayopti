import { useNostr } from '@nostrify/react';
import { NRelay1 } from '@nostrify/nostrify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';
import { normalizeRelayUrl } from '@/lib/relay-utils';
import type { RelayReview, RelayReviewSummary } from '@/types/relay-optimizer';

/** Kind 1986 is used for relay reviews */
const RELAY_REVIEW_KIND = 1986;

/** Relays to query for reviews */
const REVIEW_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://nos.lol',
];

/**
 * Parse a relay review event into our RelayReview type
 */
function parseReviewEvent(event: { id: string; pubkey: string; content: string; tags: string[][]; created_at: number }): RelayReview | null {
  // Get relay URL from r tag
  const rTag = event.tags.find(([name]) => name === 'r');
  if (!rTag || !rTag[1]) return null;

  // Get rating from rating tag (0-1 scale in Coracle format)
  const ratingTag = event.tags.find(([name]) => name === 'rating');
  let rating = 0.5; // Default to middle rating

  if (ratingTag) {
    const parsed = parseFloat(ratingTag[1]);
    if (!isNaN(parsed)) {
      // Handle both 0-1 scale and 1-5 scale
      rating = parsed > 1 ? parsed / 5 : parsed;
      rating = Math.max(0, Math.min(1, rating));
    }
  }

  return {
    id: event.id,
    pubkey: event.pubkey,
    relayUrl: normalizeRelayUrl(rTag[1]),
    content: event.content,
    rating,
    createdAt: event.created_at,
  };
}

/**
 * Convert 0-1 rating to 1-5 stars
 */
export function ratingToStars(rating: number): number {
  return Math.round(rating * 5);
}

/**
 * Convert 1-5 stars to 0-1 rating
 */
export function starsToRating(stars: number): number {
  return stars / 5;
}

/**
 * Fetch reviews for a specific relay
 * @param relayUrl - The relay URL to fetch reviews for
 */
export function useRelayReviews(relayUrl: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<RelayReviewSummary | null>({
    queryKey: ['relayReviews', relayUrl ? normalizeRelayUrl(relayUrl) : ''],
    queryFn: async ({ signal }) => {
      if (!relayUrl) return null;

      const normalizedUrl = normalizeRelayUrl(relayUrl);
      const allEvents: Array<{ id: string; pubkey: string; content: string; tags: string[][]; created_at: number }> = [];

      // Query review relays
      const queryPromises = REVIEW_RELAYS.map(async (relay) => {
        try {
          const r = new NRelay1(relay);
          const events = await r.query(
            [{
              kinds: [RELAY_REVIEW_KIND],
              '#r': [normalizedUrl],
              limit: 50,
            }],
            { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
          );
          r.close();
          return events;
        } catch {
          return [];
        }
      });

      // Also query the main pool
      try {
        const poolEvents = await nostr.query(
          [{
            kinds: [RELAY_REVIEW_KIND],
            '#r': [normalizedUrl],
            limit: 50,
          }],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
        );
        allEvents.push(...poolEvents);
      } catch {
        // Main pool query failed
      }

      // Wait for all relay queries
      const results = await Promise.all(queryPromises);
      for (const events of results) {
        allEvents.push(...events);
      }

      // Deduplicate by event ID
      const seen = new Set<string>();
      const uniqueEvents = allEvents.filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      // Parse reviews
      const reviews: RelayReview[] = [];
      for (const event of uniqueEvents) {
        const review = parseReviewEvent(event);
        if (review) {
          reviews.push(review);
        }
      }

      // Sort by most recent
      reviews.sort((a, b) => b.createdAt - a.createdAt);

      // Calculate average rating
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      return {
        relayUrl: normalizedUrl,
        averageRating,
        reviewCount: reviews.length,
        reviews,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!relayUrl,
  });
}

/**
 * Fetch reviews for multiple relays at once (more efficient)
 * @param relayUrls - The relay URLs to fetch reviews for
 */
export function useMultipleRelayReviews(relayUrls: string[]) {
  const { nostr } = useNostr();

  return useQuery<Map<string, RelayReviewSummary>>({
    queryKey: ['multipleRelayReviews', relayUrls.map(normalizeRelayUrl).sort().join(',')],
    queryFn: async ({ signal }) => {
      if (relayUrls.length === 0) return new Map();

      const normalizedUrls = [...new Set(relayUrls.map(normalizeRelayUrl))];
      const allEvents: Array<{ id: string; pubkey: string; content: string; tags: string[][]; created_at: number }> = [];

      // Query review relays
      const queryPromises = REVIEW_RELAYS.map(async (relay) => {
        try {
          const r = new NRelay1(relay);
          const events = await r.query(
            [{
              kinds: [RELAY_REVIEW_KIND],
              '#r': normalizedUrls,
              limit: 200,
            }],
            { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) }
          );
          r.close();
          return events;
        } catch {
          return [];
        }
      });

      // Also query the main pool
      try {
        const poolEvents = await nostr.query(
          [{
            kinds: [RELAY_REVIEW_KIND],
            '#r': normalizedUrls,
            limit: 200,
          }],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) }
        );
        allEvents.push(...poolEvents);
      } catch {
        // Main pool query failed
      }

      // Wait for all relay queries
      const results = await Promise.all(queryPromises);
      for (const events of results) {
        allEvents.push(...events);
      }

      // Deduplicate by event ID
      const seen = new Set<string>();
      const uniqueEvents = allEvents.filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      // Group reviews by relay URL
      const reviewsByRelay = new Map<string, RelayReview[]>();
      for (const event of uniqueEvents) {
        const review = parseReviewEvent(event);
        if (review) {
          const existing = reviewsByRelay.get(review.relayUrl) || [];
          existing.push(review);
          reviewsByRelay.set(review.relayUrl, existing);
        }
      }

      // Build summaries
      const summaries = new Map<string, RelayReviewSummary>();
      for (const url of normalizedUrls) {
        const reviews = reviewsByRelay.get(url) || [];
        reviews.sort((a, b) => b.createdAt - a.createdAt);

        const averageRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        summaries.set(url, {
          relayUrl: url,
          averageRating,
          reviewCount: reviews.length,
          reviews,
        });
      }

      return summaries;
    },
    staleTime: 5 * 60 * 1000,
    enabled: relayUrls.length > 0,
  });
}

interface SubmitReviewParams {
  relayUrl: string;
  rating: number; // 1-5 stars
  content: string;
}

/**
 * Hook to submit a relay review
 */
export function useSubmitRelayReview() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ relayUrl, rating, content }: SubmitReviewParams) => {
      if (!user) {
        throw new Error('You must be logged in to submit a review');
      }

      const normalizedUrl = normalizeRelayUrl(relayUrl);
      const ratingValue = starsToRating(rating).toFixed(2);

      // Build tags following Coracle's format
      const tags: string[][] = [
        ['L', 'review'],
        ['l', 'review/relay', 'review'],
        ['rating', ratingValue],
        ['r', normalizedUrl],
      ];

      // Add client tag
      if (location.protocol === 'https:') {
        tags.push(['client', location.hostname]);
      }

      const event = await user.signer.signEvent({
        kind: RELAY_REVIEW_KIND,
        content: content.trim(),
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      await nostr.event(event, { signal: AbortSignal.timeout(10000) });

      return { relayUrl: normalizedUrl, event };
    },
    onSuccess: ({ relayUrl }) => {
      // Invalidate review queries
      queryClient.invalidateQueries({ queryKey: ['relayReviews', relayUrl] });
      queryClient.invalidateQueries({ queryKey: ['multipleRelayReviews'] });

      toast({
        title: 'Review submitted!',
        description: 'Your relay review has been published.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to submit review',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Get average rating as stars (1-5) from reviews
 */
export function getAverageStars(reviews: RelayReview[]): number | null {
  if (reviews.length === 0) return null;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return ratingToStars(avg);
}
