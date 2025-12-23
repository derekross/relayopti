import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Inbox,
  Send,
  MessageSquare,
  Search,
  Sparkles,
  ExternalLink,
  Ban,
  Database,
  Share2,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRelays, getInboxRelays, getOutboxRelays, DEFAULT_SEARCH_RELAYS, DEFAULT_DM_RELAYS, DEFAULT_INDEXER_RELAYS, DEFAULT_BROADCAST_RELAYS } from '@/hooks/useUserRelays';
import { useContactRelays } from '@/hooks/useContactRelays';
import { useRelayPing } from '@/hooks/useRelayPing';
import { usePublishRelayLists } from '@/hooks/usePublishRelayLists';
import { useTopRelays } from '@/hooks/useTopRelays';
import { isValidRelayUrl, normalizeRelayUrl, isSameRelay } from '@/lib/relay-utils';

import { HeroSection } from './HeroSection';
import { RelayHealthCard } from './RelayHealthCard';
import { RelaySuggestionCard } from './RelaySuggestionCard';
import { TopRelaySuggestionCard } from './TopRelaySuggestionCard';
import { RelayTypesGuide } from './RelayTypeExplainer';
import { PublishButton } from './PublishButton';

import type { NIP65Relay } from '@/types/relay-optimizer';

export function RelayOptimizerPage() {
  const { user, metadata, isLoading: isUserLoading } = useCurrentUser();
  const isLoggedIn = !!user;

  // Fetch user's relay lists
  const { data: userRelays, isLoading: relaysLoading, refetch: refetchRelays } = useUserRelays(user?.pubkey);

  // Local state for editing
  const [inboxRelays, setInboxRelays] = useState<string[]>([]);
  const [outboxRelays, setOutboxRelays] = useState<string[]>([]);
  const [dmRelays, setDmRelays] = useState<string[]>([]);
  const [searchRelays, setSearchRelays] = useState<string[]>([]);
  const [blockedRelays, setBlockedRelays] = useState<string[]>([]);
  const [indexerRelays, setIndexerRelays] = useState<string[]>([]);
  const [proxyRelays, setProxyRelays] = useState<string[]>([]);
  const [broadcastRelays, setBroadcastRelays] = useState<string[]>([]);
  const [trustedRelays, setTrustedRelays] = useState<string[]>([]);

  // Track original state to detect changes
  const [originalState, setOriginalState] = useState<{
    inbox: string[];
    outbox: string[];
    dm: string[];
    search: string[];
    blocked: string[];
    indexer: string[];
    proxy: string[];
    broadcast: string[];
    trusted: string[];
  } | null>(null);

  // Track whether we're using defaults
  const [usingDefaultDm, setUsingDefaultDm] = useState(false);
  const [usingDefaultSearch, setUsingDefaultSearch] = useState(false);
  const [usingDefaultIndexer, setUsingDefaultIndexer] = useState(false);
  const [usingDefaultBroadcast, setUsingDefaultBroadcast] = useState(false);

  // Sync from fetched data
  useEffect(() => {
    if (userRelays) {
      const inbox = getInboxRelays(userRelays.nip65);
      const outbox = getOutboxRelays(userRelays.nip65);

      // Use defaults if user has none configured
      const isDmDefault = userRelays.dmRelays.length === 0;
      const isSearchDefault = userRelays.searchRelays.length === 0;
      const isIndexerDefault = userRelays.indexerRelays.length === 0;
      const isBroadcastDefault = userRelays.broadcastRelays.length === 0;

      const dm = isDmDefault ? DEFAULT_DM_RELAYS : userRelays.dmRelays;
      const search = isSearchDefault ? DEFAULT_SEARCH_RELAYS : userRelays.searchRelays;
      const indexer = isIndexerDefault ? DEFAULT_INDEXER_RELAYS : userRelays.indexerRelays;
      const broadcast = isBroadcastDefault ? DEFAULT_BROADCAST_RELAYS : userRelays.broadcastRelays;

      setUsingDefaultDm(isDmDefault);
      setUsingDefaultSearch(isSearchDefault);
      setUsingDefaultIndexer(isIndexerDefault);
      setUsingDefaultBroadcast(isBroadcastDefault);

      setInboxRelays(inbox);
      setOutboxRelays(outbox);
      setDmRelays(dm);
      setSearchRelays(search);
      setBlockedRelays(userRelays.blockedRelays);
      setIndexerRelays(indexer);
      setProxyRelays(userRelays.proxyRelays);
      setBroadcastRelays(broadcast);
      setTrustedRelays(userRelays.trustedRelays);

      setOriginalState({
        inbox,
        outbox,
        dm,
        search,
        blocked: userRelays.blockedRelays,
        indexer,
        proxy: userRelays.proxyRelays,
        broadcast,
        trusted: userRelays.trustedRelays,
      });
    }
  }, [userRelays]);

  // Ping testing
  const { statuses, isTesting, testAllRelays, testRelay } = useRelayPing();

  // Test relays when data loads
  useEffect(() => {
    const allRelays = [...inboxRelays, ...outboxRelays, ...dmRelays, ...searchRelays];
    const uniqueRelays = [...new Set(allRelays)];
    if (uniqueRelays.length > 0 && !isTesting) {
      testAllRelays(uniqueRelays);
    }
    // Only run when relay lists change, not when testing state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxRelays, outboxRelays, dmRelays, searchRelays]);

  // Compute all user relays for contact analysis (excluding blocked)
  const allUserRelays = useMemo(() => {
    return [...new Set([
      ...inboxRelays,
      ...outboxRelays,
      ...dmRelays,
      ...searchRelays,
      ...indexerRelays,
      ...proxyRelays,
      ...broadcastRelays,
      ...trustedRelays,
    ])];
  }, [inboxRelays, outboxRelays, dmRelays, searchRelays, indexerRelays, proxyRelays, broadcastRelays, trustedRelays]);

  // Contact relay suggestions
  const { data: contactData, isLoading: contactsLoading } = useContactRelays(user?.pubkey, allUserRelays);

  // Check if user has no inbox/outbox relays (to show top relay suggestions)
  const hasNoInboxOutbox = inboxRelays.length === 0 && outboxRelays.length === 0;

  // Fetch top relays from nostr.watch when user has no relays configured
  const { data: topRelays, isLoading: topRelaysLoading } = useTopRelays(hasNoInboxOutbox && isLoggedIn);

  // Test top relays too
  useEffect(() => {
    if (topRelays && topRelays.length > 0) {
      const newRelays = topRelays.filter(url => !statuses.has(url));
      if (newRelays.length > 0) {
        newRelays.forEach(url => testRelay(url));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topRelays]);

  // Test suggested relays too
  useEffect(() => {
    if (contactData?.suggestions) {
      const newRelays = contactData.suggestions
        .filter(s => !s.alreadyUsed)
        .slice(0, 20)
        .map(s => s.url)
        .filter(url => !statuses.has(url));

      if (newRelays.length > 0) {
        newRelays.forEach(url => testRelay(url));
      }
    }
    // Only run when suggestions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactData?.suggestions]);

  // Publishing
  const { mutateAsync: publishLists, isPending: isPublishing } = usePublishRelayLists();

  // Detect changes
  const hasChanges = useMemo(() => {
    if (!originalState) return false;

    const arraysEqual = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((v, i) => v === sortedB[i]);
    };

    return (
      !arraysEqual(inboxRelays, originalState.inbox) ||
      !arraysEqual(outboxRelays, originalState.outbox) ||
      !arraysEqual(dmRelays, originalState.dm) ||
      !arraysEqual(searchRelays, originalState.search) ||
      !arraysEqual(blockedRelays, originalState.blocked) ||
      !arraysEqual(indexerRelays, originalState.indexer) ||
      !arraysEqual(proxyRelays, originalState.proxy) ||
      !arraysEqual(broadcastRelays, originalState.broadcast) ||
      !arraysEqual(trustedRelays, originalState.trusted)
    );
  }, [inboxRelays, outboxRelays, dmRelays, searchRelays, blockedRelays, indexerRelays, proxyRelays, broadcastRelays, trustedRelays, originalState]);

  // Add relay dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'inbox' | 'outbox' | 'dm' | 'search' | 'blocked' | 'indexer' | 'proxy' | 'broadcast' | 'trusted'>('inbox');
  const [newRelayUrl, setNewRelayUrl] = useState('');

  const openAddDialog = (type: typeof addDialogType) => {
    setAddDialogType(type);
    setNewRelayUrl('');
    setAddDialogOpen(true);
  };

  const handleAddRelay = () => {
    let url = newRelayUrl.trim();
    if (!url) return;

    // Auto-add wss:// if missing
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
      url = 'wss://' + url;
    }

    if (!isValidRelayUrl(url)) return;

    const normalized = normalizeRelayUrl(url);

    switch (addDialogType) {
      case 'inbox':
        if (!inboxRelays.some(r => isSameRelay(r, normalized))) {
          setInboxRelays([...inboxRelays, url]);
        }
        break;
      case 'outbox':
        if (!outboxRelays.some(r => isSameRelay(r, normalized))) {
          setOutboxRelays([...outboxRelays, url]);
        }
        break;
      case 'dm':
        if (!dmRelays.some(r => isSameRelay(r, normalized))) {
          setDmRelays([...dmRelays, url]);
        }
        break;
      case 'search':
        if (!searchRelays.some(r => isSameRelay(r, normalized))) {
          setSearchRelays([...searchRelays, url]);
        }
        break;
      case 'blocked':
        if (!blockedRelays.some(r => isSameRelay(r, normalized))) {
          setBlockedRelays([...blockedRelays, url]);
        }
        break;
      case 'indexer':
        if (!indexerRelays.some(r => isSameRelay(r, normalized))) {
          setIndexerRelays([...indexerRelays, url]);
        }
        break;
      case 'proxy':
        if (!proxyRelays.some(r => isSameRelay(r, normalized))) {
          setProxyRelays([...proxyRelays, url]);
        }
        break;
      case 'broadcast':
        if (!broadcastRelays.some(r => isSameRelay(r, normalized))) {
          setBroadcastRelays([...broadcastRelays, url]);
        }
        break;
      case 'trusted':
        if (!trustedRelays.some(r => isSameRelay(r, normalized))) {
          setTrustedRelays([...trustedRelays, url]);
        }
        break;
    }

    // Test the new relay (except blocked relays)
    if (addDialogType !== 'blocked') {
      testRelay(url);
    }
    setAddDialogOpen(false);
    setNewRelayUrl('');
  };

  // Build NIP65 array from inbox/outbox
  const nip65Relays = useMemo((): NIP65Relay[] => {
    const relayMap = new Map<string, NIP65Relay>();

    for (const url of inboxRelays) {
      const normalized = normalizeRelayUrl(url);
      const existing = relayMap.get(normalized);
      if (existing) {
        existing.read = true;
      } else {
        relayMap.set(normalized, { url, read: true, write: false });
      }
    }

    for (const url of outboxRelays) {
      const normalized = normalizeRelayUrl(url);
      const existing = relayMap.get(normalized);
      if (existing) {
        existing.write = true;
      } else {
        relayMap.set(normalized, { url, read: false, write: true });
      }
    }

    return Array.from(relayMap.values());
  }, [inboxRelays, outboxRelays]);

  // Handlers for relay cards
  const handleToggleRead = useCallback((url: string) => {
    const normalized = normalizeRelayUrl(url);
    const isCurrentlyRead = inboxRelays.some(r => isSameRelay(r, normalized));

    if (isCurrentlyRead) {
      setInboxRelays(inboxRelays.filter(r => !isSameRelay(r, normalized)));
    } else {
      setInboxRelays([...inboxRelays, url]);
    }
  }, [inboxRelays]);

  const handleToggleWrite = useCallback((url: string) => {
    const normalized = normalizeRelayUrl(url);
    const isCurrentlyWrite = outboxRelays.some(r => isSameRelay(r, normalized));

    if (isCurrentlyWrite) {
      setOutboxRelays(outboxRelays.filter(r => !isSameRelay(r, normalized)));
    } else {
      setOutboxRelays([...outboxRelays, url]);
    }
  }, [outboxRelays]);

  const handleRemoveNip65 = useCallback((url: string) => {
    const normalized = normalizeRelayUrl(url);
    setInboxRelays(inboxRelays.filter(r => !isSameRelay(r, normalized)));
    setOutboxRelays(outboxRelays.filter(r => !isSameRelay(r, normalized)));
  }, [inboxRelays, outboxRelays]);

  const handleRemoveDm = useCallback((url: string) => {
    setDmRelays(dmRelays.filter(r => !isSameRelay(r, url)));
  }, [dmRelays]);

  const handleRemoveSearch = useCallback((url: string) => {
    setSearchRelays(searchRelays.filter(r => !isSameRelay(r, url)));
  }, [searchRelays]);

  const handleRemoveBlocked = useCallback((url: string) => {
    setBlockedRelays(blockedRelays.filter(r => !isSameRelay(r, url)));
  }, [blockedRelays]);

  const handleRemoveIndexer = useCallback((url: string) => {
    setIndexerRelays(indexerRelays.filter(r => !isSameRelay(r, url)));
  }, [indexerRelays]);

  const handleRemoveProxy = useCallback((url: string) => {
    setProxyRelays(proxyRelays.filter(r => !isSameRelay(r, url)));
  }, [proxyRelays]);

  const handleRemoveBroadcast = useCallback((url: string) => {
    setBroadcastRelays(broadcastRelays.filter(r => !isSameRelay(r, url)));
  }, [broadcastRelays]);

  const handleRemoveTrusted = useCallback((url: string) => {
    setTrustedRelays(trustedRelays.filter(r => !isSameRelay(r, url)));
  }, [trustedRelays]);

  // Suggestion handlers
  const handleAddToInbox = useCallback((url: string) => {
    if (!inboxRelays.some(r => isSameRelay(r, url))) {
      setInboxRelays([...inboxRelays, url]);
    }
  }, [inboxRelays]);

  const handleAddToOutbox = useCallback((url: string) => {
    if (!outboxRelays.some(r => isSameRelay(r, url))) {
      setOutboxRelays([...outboxRelays, url]);
    }
  }, [outboxRelays]);

  const handleAddToDm = useCallback((url: string) => {
    if (!dmRelays.some(r => isSameRelay(r, url))) {
      setDmRelays([...dmRelays, url]);
    }
  }, [dmRelays]);

  // Publish handler
  const handlePublish = async () => {
    await publishLists({
      inboxRelays,
      outboxRelays,
      dmRelays,
      searchRelays,
      blockedRelays,
      indexerRelays,
      proxyRelays,
      broadcastRelays,
      trustedRelays,
    });
    // Update original state after publish
    setOriginalState({
      inbox: inboxRelays,
      outbox: outboxRelays,
      dm: dmRelays,
      search: searchRelays,
      blocked: blockedRelays,
      indexer: indexerRelays,
      proxy: proxyRelays,
      broadcast: broadcastRelays,
      trusted: trustedRelays,
    });
    refetchRelays();
  };

  // Suggestions excluding already used
  const unusedSuggestions = useMemo(() => {
    if (!contactData?.suggestions) return [];
    return contactData.suggestions
      .filter(s => !s.alreadyUsed)
      .slice(0, 20);
  }, [contactData?.suggestions]);

  // Logged out: full-screen hero with no container constraints
  if (!isLoggedIn) {
    return (
      <HeroSection
        isLoggedIn={false}
        userMetadata={undefined}
      />
    );
  }

  // Loading transition: show full-screen loading while fetching user data
  if (isUserLoading && !metadata) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[128px] animate-pulse" />
        {/* Loading content */}
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-white/60 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Logged in: normal constrained layout with dark theme
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Subtle background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="relative container max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <HeroSection
          isLoggedIn={isLoggedIn}
          userMetadata={metadata}
          className="mb-8"
        />

        {/* Main content */}
        <>
            {/* Your Relays Section */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    Your Relays
                  </h2>
                  <p className="text-sm text-white/60">
                    Manage where your content is published and discovered
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <RelayTypesGuide />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allRelays = [...new Set([...inboxRelays, ...outboxRelays, ...dmRelays, ...searchRelays])];
                      testAllRelays(allRelays);
                    }}
                    disabled={isTesting}
                    className="gap-1.5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    <RefreshCw className={cn('w-4 h-4', isTesting && 'animate-spin')} />
                    {isTesting ? 'Testing...' : 'Test All'}
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="inbox-outbox" className="w-full">
                <TabsList className="w-full justify-start mb-4 bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
                  <TabsTrigger value="inbox-outbox" className="gap-1.5 data-[state=active]:bg-violet-500 data-[state=active]:text-white text-white/70">
                    <Inbox className="w-4 h-4" />
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Inbox & Outbox</span>
                  </TabsTrigger>
                  <TabsTrigger value="dm" className="gap-1.5 data-[state=active]:bg-pink-500 data-[state=active]:text-white text-white/70">
                    <MessageSquare className="w-4 h-4" />
                    DM
                  </TabsTrigger>
                  <TabsTrigger value="search" className="gap-1.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-white/70">
                    <Search className="w-4 h-4" />
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="indexer" className="gap-1.5 data-[state=active]:bg-blue-500 data-[state=active]:text-white text-white/70">
                    <Database className="w-4 h-4" />
                    Indexer
                  </TabsTrigger>
                  <TabsTrigger value="proxy" className="gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/70">
                    <Share2 className="w-4 h-4" />
                    Proxy
                  </TabsTrigger>
                  <TabsTrigger value="broadcast" className="gap-1.5 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-white/70">
                    <Radio className="w-4 h-4" />
                    Broadcast
                  </TabsTrigger>
                  <TabsTrigger value="trusted" className="gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white text-white/70">
                    <ShieldCheck className="w-4 h-4" />
                    Trusted
                  </TabsTrigger>
                  <TabsTrigger value="blocked" className="gap-1.5 data-[state=active]:bg-red-500 data-[state=active]:text-white text-white/70">
                    <Ban className="w-4 h-4" />
                    Blocked
                  </TabsTrigger>
                </TabsList>

                {/* Inbox/Outbox Tab */}
                <TabsContent value="inbox-outbox" className="space-y-4">
                  {relaysLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                      ))}
                    </div>
                  ) : nip65Relays.length === 0 ? (
                    <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-white/20 bg-white/5">
                      <Inbox className="w-12 h-12 mx-auto text-white/30 mb-4" />
                      <h3 className="font-semibold mb-2 text-white">No relays configured</h3>
                      <p className="text-sm text-white/60 mb-4">
                        Add some relays to get started, or check the suggestions below!
                      </p>
                      <Button onClick={() => openAddDialog('inbox')} className="gap-2 bg-violet-500 hover:bg-violet-600">
                        <Plus className="w-4 h-4" />
                        Add Your First Relay
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3">
                        {nip65Relays.map(relay => (
                          <RelayHealthCard
                            key={relay.url}
                            relay={statuses.get(relay.url) || {
                              url: relay.url,
                              latency: null,
                              status: 'unknown',
                              lastTested: 0,
                            }}
                            read={relay.read}
                            write={relay.write}
                            onToggleRead={() => handleToggleRead(relay.url)}
                            onToggleWrite={() => handleToggleWrite(relay.url)}
                            onRemove={() => handleRemoveNip65(relay.url)}
                            type="nip65"
                          />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => openAddDialog('inbox')}
                        className="w-full gap-2 border-dashed border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Add Relay
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* DM Tab */}
                <TabsContent value="dm" className="space-y-4">
                  {relaysLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
                    </div>
                  ) : (
                    <>
                      {usingDefaultDm && (
                        <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-sm">
                          <p className="text-pink-300">
                            <strong>Using suggested defaults.</strong> You don't have DM relays published yet.
                            Publish to save these to your profile.
                          </p>
                        </div>
                      )}

                      <div className="grid gap-3">
                        {dmRelays.map(url => (
                          <RelayHealthCard
                            key={url}
                            relay={statuses.get(url) || {
                              url,
                              latency: null,
                              status: 'unknown',
                              lastTested: 0,
                            }}
                            onRemove={() => handleRemoveDm(url)}
                            type="dm"
                          />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => openAddDialog('dm')}
                        className="w-full gap-2 border-dashed border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Add DM Relay
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* Search Tab */}
                <TabsContent value="search" className="space-y-4">
                  {relaysLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
                    </div>
                  ) : (
                    <>
                      {usingDefaultSearch && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
                          <p className="text-emerald-300">
                            <strong>Using suggested defaults.</strong> You don't have search relays published yet.
                            Publish to save these to your profile.
                          </p>
                        </div>
                      )}

                      <div className="grid gap-3">
                        {searchRelays.map(url => (
                          <RelayHealthCard
                            key={url}
                            relay={statuses.get(url) || {
                              url,
                              latency: null,
                              status: 'unknown',
                              lastTested: 0,
                            }}
                            onRemove={() => handleRemoveSearch(url)}
                            type="search"
                          />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => openAddDialog('search')}
                        className="w-full gap-2 border-dashed border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Add Search Relay
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* Blocked Tab */}
                <TabsContent value="blocked" className="space-y-4">
                  {relaysLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
                        <p className="text-red-300">
                          Relays that clients should never connect to. Use this to block spam or malicious relays.
                        </p>
                      </div>

                      {blockedRelays.length > 0 ? (
                        <div className="grid gap-3">
                          {blockedRelays.map(url => (
                            <RelayHealthCard
                              key={url}
                              relay={statuses.get(url) || {
                                url,
                                latency: null,
                                status: 'unknown',
                                lastTested: 0,
                              }}
                              onRemove={() => handleRemoveBlocked(url)}
                              type="dm"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-white/50">
                          No blocked relays configured
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => openAddDialog('blocked')}
                        className="w-full gap-2 border-dashed border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Block a Relay
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* Indexer Tab */}
                <TabsContent value="indexer" className="space-y-4">
                  {relaysLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
                    </div>
                  ) : (
                    <>
                      {usingDefaultIndexer && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                          <p className="text-blue-300">
                            <strong>Using suggested defaults.</strong> You don't have indexer relays published yet.
                            Publish to save these to your profile.
                          </p>
                        </div>
                      )}

                      {!usingDefaultIndexer && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                          <p className="text-blue-300">
                            Relays for downloading/sending profile (kind 0) and relay list (kind 10002) events.
                          </p>
                        </div>
                      )}

                      {indexerRelays.length > 0 ? (
                        <div className="grid gap-3">
                          {indexerRelays.map(url => (
                            <RelayHealthCard
                              key={url}
                              relay={statuses.get(url) || {
                                url,
                                latency: null,
                                status: 'unknown',
                                lastTested: 0,
                              }}
                              onRemove={() => handleRemoveIndexer(url)}
                              type="dm"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-white/50">
                          No indexer relays configured
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => openAddDialog('indexer')}
                        className="w-full gap-2 border-dashed border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Add Indexer Relay
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* Proxy Tab */}
                <TabsContent value="proxy" className="space-y-4">
                  {relaysLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm">
                        <p className="text-orange-300">
                          Proxy/aggregator relays to load content from. These relays aggregate data from multiple sources.
                        </p>
                      </div>

                      {proxyRelays.length > 0 ? (
                        <div className="grid gap-3">
                          {proxyRelays.map(url => (
                            <RelayHealthCard
                              key={url}
                              relay={statuses.get(url) || {
                                url,
                                latency: null,
                                status: 'unknown',
                                lastTested: 0,
                              }}
                              onRemove={() => handleRemoveProxy(url)}
                              type="dm"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-white/50">
                          No proxy relays configured
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => openAddDialog('proxy')}
                        className="w-full gap-2 border-dashed border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Add Proxy Relay
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* Broadcast Tab */}
                <TabsContent value="broadcast" className="space-y-4">
                  {relaysLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
                    </div>
                  ) : (
                    <>
                      {usingDefaultBroadcast && (
                        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm">
                          <p className="text-cyan-300">
                            <strong>Using suggested defaults.</strong> You don't have broadcast relays published yet.
                            Publish to save these to your profile.
                          </p>
                        </div>
                      )}

                      {!usingDefaultBroadcast && (
                        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm">
                          <p className="text-cyan-300">
                            Relays to broadcast events to. Use these to ensure wide distribution of your content.
                          </p>
                        </div>
                      )}

                      {broadcastRelays.length > 0 ? (
                        <div className="grid gap-3">
                          {broadcastRelays.map(url => (
                            <RelayHealthCard
                              key={url}
                              relay={statuses.get(url) || {
                                url,
                                latency: null,
                                status: 'unknown',
                                lastTested: 0,
                              }}
                              onRemove={() => handleRemoveBroadcast(url)}
                              type="dm"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-white/50">
                          No broadcast relays configured
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => openAddDialog('broadcast')}
                        className="w-full gap-2 border-dashed border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Add Broadcast Relay
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* Trusted Tab */}
                <TabsContent value="trusted" className="space-y-4">
                  {relaysLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
                        <p className="text-amber-300">
                          Trusted relays that are allowed to see your IP address. Only add relays you fully trust.
                        </p>
                      </div>

                      {trustedRelays.length > 0 ? (
                        <div className="grid gap-3">
                          {trustedRelays.map(url => (
                            <RelayHealthCard
                              key={url}
                              relay={statuses.get(url) || {
                                url,
                                latency: null,
                                status: 'unknown',
                                lastTested: 0,
                              }}
                              onRemove={() => handleRemoveTrusted(url)}
                              type="dm"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-white/50">
                          No trusted relays configured
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => openAddDialog('trusted')}
                        className="w-full gap-2 border-dashed border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Add Trusted Relay
                      </Button>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Top Relays Section - shown when user has no inbox/outbox */}
            {hasNoInboxOutbox && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      Get Started with Top Relays
                    </h2>
                    <p className="text-sm text-white/60">
                      Popular online relays from nostr.watch to get you started
                    </p>
                  </div>
                </div>

                {topRelaysLoading ? (
                  <div className="grid gap-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-32 w-full rounded-2xl bg-white/5" />
                    ))}
                  </div>
                ) : topRelays && topRelays.length > 0 ? (
                  <div className="grid gap-3">
                    {topRelays.map(url => (
                      <TopRelaySuggestionCard
                        key={url}
                        url={url}
                        relayStatus={statuses.get(url)}
                        onAddToInbox={() => handleAddToInbox(url)}
                        onAddToOutbox={() => handleAddToOutbox(url)}
                        alreadyUsed={inboxRelays.includes(url) || outboxRelays.includes(url)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-white/20 bg-white/5">
                    <Sparkles className="w-12 h-12 mx-auto text-emerald-400/50 mb-4" />
                    <h3 className="font-semibold mb-2 text-white">Unable to load top relays</h3>
                    <p className="text-sm text-white/60">
                      Check out nostr.watch for relay suggestions, or add relays manually.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions Section - from contacts */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    {hasNoInboxOutbox ? 'Relays Your Friends Use' : 'Suggested Relays'}
                  </h2>
                  <p className="text-sm text-white/60">
                    {contactData ? (
                      <>
                        Based on {contactData.analyzedCount} of your {contactData.contactCount} contacts
                      </>
                    ) : (
                      'Relays your friends are using'
                    )}
                  </p>
                </div>
              </div>

              {contactsLoading ? (
                <div className="grid gap-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 w-full rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : unusedSuggestions.length === 0 ? (
                <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-white/20 bg-white/5">
                  <Sparkles className="w-12 h-12 mx-auto text-amber-400/50 mb-4" />
                  <h3 className="font-semibold mb-2 text-white">No new suggestions</h3>
                  <p className="text-sm text-white/60">
                    {hasNoInboxOutbox
                      ? "We couldn't find relay info from your contacts. Try the top relays above!"
                      : "You're already using the most popular relays among your contacts!"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {unusedSuggestions.map(suggestion => (
                    <RelaySuggestionCard
                      key={suggestion.url}
                      suggestion={suggestion}
                      relayStatus={statuses.get(suggestion.url)}
                      onAddToInbox={() => handleAddToInbox(suggestion.url)}
                      onAddToOutbox={() => handleAddToOutbox(suggestion.url)}
                      onAddToDM={() => handleAddToDm(suggestion.url)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer with nostr.watch link */}
            <div className="text-center py-8 border-t border-white/10">
              <p className="text-sm text-white/50 mb-2">
                Want to explore more relays?
              </p>
              <a
                href="https://nostr.watch"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Visit nostr.watch for advanced relay exploration
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
        </>

        {/* Add Relay Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                Add {addDialogType === 'inbox' ? 'Inbox/Outbox' : addDialogType.toUpperCase()} Relay
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Enter the WebSocket URL of the relay you want to add.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Input
                placeholder="wss://relay.example.com"
                value={newRelayUrl}
                onChange={e => setNewRelayUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddRelay()}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-violet-500"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRelay}
                disabled={!newRelayUrl.trim()}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Relay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Publish Button */}
        <PublishButton
          hasChanges={hasChanges}
          isPublishing={isPublishing}
          onPublish={handlePublish}
          changesSummary={{
            inbox: inboxRelays.length,
            outbox: outboxRelays.length,
            dm: dmRelays.length,
            search: searchRelays.length,
          }}
        />
      </div>
    </div>
  );
}
