import type { RelayStatusType } from '@/types/relay-optimizer';

/**
 * Normalize a relay URL for consistent comparison
 * - Lowercases the hostname
 * - Removes trailing slashes
 * - Removes default ports (443 for wss, 80 for ws)
 */
export function normalizeRelayUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove default ports
    if (
      (parsed.protocol === 'wss:' && parsed.port === '443') ||
      (parsed.protocol === 'ws:' && parsed.port === '80')
    ) {
      parsed.port = '';
    }

    // Remove trailing slash from pathname
    if (parsed.pathname === '/') {
      parsed.pathname = '';
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Validate that a URL is a valid WebSocket relay URL
 */
export function isValidRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
  } catch {
    return false;
  }
}

/**
 * Get a display-friendly version of a relay URL
 * Removes protocol and trailing slashes
 */
export function getRelayDisplayUrl(url: string): string {
  return url
    .replace(/^wss?:\/\//, '')
    .replace(/\/$/, '');
}

/**
 * Categorize latency into status
 */
export function categorizeLatency(latencyMs: number | null): RelayStatusType {
  if (latencyMs === null) return 'bad';
  if (latencyMs < 100) return 'good';
  if (latencyMs < 300) return 'ok';
  return 'bad';
}

/**
 * Get HTTP URL from WebSocket URL for NIP-11 fetch
 */
export function getHttpUrl(wsUrl: string): string {
  return wsUrl
    .replace('wss://', 'https://')
    .replace('ws://', 'http://');
}

/**
 * Deduplicate relay URLs (normalized)
 */
export function deduplicateRelays(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    const normalized = normalizeRelayUrl(url);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(url);
    }
  }

  return result;
}

/**
 * Check if two relay URLs are the same (normalized comparison)
 */
export function isSameRelay(url1: string, url2: string): boolean {
  return normalizeRelayUrl(url1) === normalizeRelayUrl(url2);
}

/**
 * Sort relays by latency (fastest first, unknown last)
 */
export function sortByLatency<T extends { latency: number | null }>(relays: T[]): T[] {
  return [...relays].sort((a, b) => {
    if (a.latency === null && b.latency === null) return 0;
    if (a.latency === null) return 1;
    if (b.latency === null) return -1;
    return a.latency - b.latency;
  });
}

/**
 * Get a fun description based on latency
 */
export function getLatencyDescription(latency: number | null): string {
  if (latency === null) return 'Unreachable';
  if (latency < 50) return 'Lightning fast!';
  if (latency < 100) return 'Super quick';
  if (latency < 200) return 'Pretty good';
  if (latency < 300) return 'Decent';
  if (latency < 500) return 'A bit slow';
  return 'Quite slow';
}
