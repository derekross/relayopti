import { useCallback, useState } from 'react';
import type { RelayStatusWithInfo, NIP11Info } from '@/types/relay-optimizer';
import { categorizeLatency, getHttpUrl } from '@/lib/relay-utils';

/**
 * Hook for testing relay connectivity and latency
 */
export function useRelayPing() {
  const [statuses, setStatuses] = useState<Map<string, RelayStatusWithInfo>>(new Map());
  const [isTesting, setIsTesting] = useState(false);

  /**
   * Test a single relay's connectivity and latency, also fetching NIP-11 info
   */
  const testRelay = useCallback(async (url: string): Promise<RelayStatusWithInfo> => {
    // Mark as testing
    setStatuses(prev => {
      const next = new Map(prev);
      next.set(url, {
        url,
        latency: null,
        status: 'testing',
        lastTested: Date.now(),
      });
      return next;
    });

    const start = performance.now();

    try {
      // Attempt to fetch NIP-11 relay info document
      const httpUrl = getHttpUrl(url);
      const response = await fetch(httpUrl, {
        headers: { Accept: 'application/nostr+json' },
        signal: AbortSignal.timeout(5000),
      });

      const latency = Math.round(performance.now() - start);

      let nip11: NIP11Info | undefined;
      if (response.ok) {
        try {
          nip11 = await response.json() as NIP11Info;
        } catch {
          // Failed to parse NIP-11 JSON, continue without it
        }
      }

      const result: RelayStatusWithInfo = response.ok
        ? { url, latency, status: categorizeLatency(latency), lastTested: Date.now(), nip11 }
        : { url, latency: null, status: 'bad', lastTested: Date.now() };

      setStatuses(prev => {
        const next = new Map(prev);
        next.set(url, result);
        return next;
      });

      return result;
    } catch {
      const result: RelayStatusWithInfo = {
        url,
        latency: null,
        status: 'bad',
        lastTested: Date.now(),
      };

      setStatuses(prev => {
        const next = new Map(prev);
        next.set(url, result);
        return next;
      });

      return result;
    }
  }, []);

  /**
   * Test multiple relays concurrently
   */
  const testAllRelays = useCallback(async (urls: string[]): Promise<Map<string, RelayStatusWithInfo>> => {
    setIsTesting(true);

    try {
      // Test all relays in parallel with a small delay between each to avoid overwhelming
      const results = await Promise.all(
        urls.map((url, index) =>
          new Promise<RelayStatusWithInfo>(resolve =>
            setTimeout(() => testRelay(url).then(resolve), index * 100)
          )
        )
      );

      const resultMap = new Map<string, RelayStatusWithInfo>();
      for (const result of results) {
        resultMap.set(result.url, result);
      }

      return resultMap;
    } finally {
      setIsTesting(false);
    }
  }, [testRelay]);

  /**
   * Get status for a specific relay
   */
  const getStatus = useCallback((url: string): RelayStatusWithInfo | undefined => {
    return statuses.get(url);
  }, [statuses]);

  /**
   * Clear all cached statuses
   */
  const clearStatuses = useCallback(() => {
    setStatuses(new Map());
  }, []);

  return {
    statuses,
    isTesting,
    testRelay,
    testAllRelays,
    getStatus,
    clearStatuses,
  };
}
