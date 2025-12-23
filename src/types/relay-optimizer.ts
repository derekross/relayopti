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
export type RelayCategory = 'inbox' | 'outbox' | 'dm' | 'search';

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
  } | null;
}

/** Result of publishing relay lists */
export interface PublishResult {
  nip65: boolean;
  dm: boolean;
  search: boolean;
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
  rating?: number; // 1-5 stars if available
  createdAt: number;
}
