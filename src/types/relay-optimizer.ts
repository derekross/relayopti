/**
 * Relay Optimizer Types
 * TypeScript interfaces for the relay optimization system
 */

/** Status of a relay's connectivity and latency */
export type RelayStatusType = 'good' | 'ok' | 'bad' | 'unknown' | 'testing';

/** Information about a single relay's health */
export interface RelayStatus {
  url: string;
  latency: number | null; // ms, null = unreachable
  status: RelayStatusType;
  lastTested: number;
}

/** A relay with read/write permissions (NIP-65) */
export interface NIP65Relay {
  url: string;
  read: boolean;
  write: boolean;
}

/** User's complete relay configuration */
export interface UserRelayLists {
  /** NIP-65 inbox/outbox relays (kind 10002) */
  nip65: NIP65Relay[];
  /** DM relays (kind 10050) */
  dmRelays: string[];
  /** Search relays (kind 10007) */
  searchRelays: string[];
  /** Blocked relays (kind 10006) - relays clients should never connect to */
  blockedRelays: string[];
  /** Indexer relays (kind 10086) - where to download/send kinds 0 and 10002 */
  indexerRelays: string[];
  /** Proxy relays (kind 10087) - proxy/aggregator relays to load from */
  proxyRelays: string[];
  /** Broadcast relays (kind 10088) - relays to send events to */
  broadcastRelays: string[];
  /** Trusted relays (kind 10089) - trusted relays that can see user's IP */
  trustedRelays: string[];
  /** Timestamp when data was fetched */
  fetchedAt: number;
}

/** Information about a contact's relay usage */
export interface ContactRelayInfo {
  pubkey: string;
  displayName?: string;
  picture?: string;
  relays: string[];
  source: 'nip65' | 'profile' | 'both';
}

/** A relay suggestion based on contact usage */
export interface RelaySuggestion {
  url: string;
  /** Number of contacts using this relay */
  contactCount: number;
  /** List of contacts who use this relay */
  contacts: ContactRelayInfo[];
  /** Where we found this relay info */
  source: 'nip65' | 'profile' | 'both';
  /** Whether user already has this relay */
  alreadyUsed: boolean;
}

/** Categories of relays the user can manage */
export type RelayCategory = 'inbox' | 'outbox' | 'dm' | 'search' | 'blocked' | 'indexer' | 'proxy' | 'broadcast' | 'trusted';

/** State for the relay optimizer */
export interface RelayOptimizerState {
  /** Read relays (inbox) */
  inboxRelays: string[];
  /** Write relays (outbox) */
  outboxRelays: string[];
  /** DM relays */
  dmRelays: string[];
  /** Search relays */
  searchRelays: string[];
  /** Blocked relays */
  blockedRelays: string[];
  /** Indexer relays */
  indexerRelays: string[];
  /** Proxy relays */
  proxyRelays: string[];
  /** Broadcast relays */
  broadcastRelays: string[];
  /** Trusted relays */
  trustedRelays: string[];
  /** Health status for all known relays */
  relayStatuses: Map<string, RelayStatus>;
  /** Suggestions from contacts */
  suggestions: RelaySuggestion[];
  /** Whether analysis is in progress */
  isAnalyzing: boolean;
  /** Whether there are unpublished changes */
  hasChanges: boolean;
  /** Original state for comparison */
  originalState: {
    inboxRelays: string[];
    outboxRelays: string[];
    dmRelays: string[];
    searchRelays: string[];
    blockedRelays: string[];
    indexerRelays: string[];
    proxyRelays: string[];
    broadcastRelays: string[];
    trustedRelays: string[];
  } | null;
}

/** Result of publishing relay lists */
export interface PublishResult {
  nip65: boolean;
  dm: boolean;
  search: boolean;
  blocked: boolean;
  indexer: boolean;
  proxy: boolean;
  broadcast: boolean;
  trusted: boolean;
  errors: string[];
}

/** NIP-11 Relay Information Document */
export interface NIP11Info {
  name?: string;
  description?: string;
  banner?: string;
  icon?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  privacy_policy?: string;
  terms_of_service?: string;
  limitation?: {
    max_message_length?: number;
    max_subscriptions?: number;
    max_limit?: number;
    max_event_tags?: number;
    max_content_length?: number;
    min_pow_difficulty?: number;
    auth_required?: boolean;
    payment_required?: boolean;
    restricted_writes?: boolean;
  };
  fees?: {
    admission?: { amount: number; unit: string }[];
    subscription?: { amount: number; unit: string; period?: number }[];
    publication?: { kinds?: number[]; amount: number; unit: string }[];
  };
  relay_countries?: string[];
  language_tags?: string[];
  tags?: string[];
  posting_policy?: string;
  payments_url?: string;
}

/** Extended relay status with NIP-11 info */
export interface RelayStatusWithInfo extends RelayStatus {
  nip11?: NIP11Info;
}

/** Relay review (kind 1986) */
export interface RelayReview {
  id: string;
  pubkey: string;
  relayUrl: string;
  content: string;
  /** Rating from 0-1 (0.2 = 1 star, 0.4 = 2 stars, etc.) */
  rating: number;
  createdAt: number;
  /** Author metadata if available */
  author?: {
    name?: string;
    picture?: string;
    nip05?: string;
  };
}

/** Aggregated review data for a relay */
export interface RelayReviewSummary {
  relayUrl: string;
  /** Average rating (0-1) */
  averageRating: number;
  /** Total number of reviews */
  reviewCount: number;
  /** Individual reviews */
  reviews: RelayReview[];
}
