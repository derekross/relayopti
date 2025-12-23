import { Inbox, Send, MessageSquare, Search, HelpCircle, Ban, Database, Share2, Radio, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type RelayType = 'inbox' | 'outbox' | 'dm' | 'search' | 'blocked' | 'indexer' | 'proxy' | 'broadcast' | 'trusted';

interface RelayTypeExplainerProps {
  type: RelayType;
  variant?: 'tooltip' | 'inline';
  className?: string;
}

const relayTypeInfo: Record<RelayType, {
  icon: typeof Inbox;
  title: string;
  shortDesc: string;
  longDesc: string;
  tips: string[];
  color: string;
  bgColor: string;
}> = {
  inbox: {
    icon: Inbox,
    title: 'Inbox (Read) Relays',
    shortDesc: 'Where others find you',
    longDesc: 'These are relays where other people can find your posts and send you mentions. Think of it like your mailing address - people need to know where to send things to reach you.',
    tips: [
      'Use 2-4 inbox relays for good coverage',
      'Pick reliable relays that are always online',
      'Popular relays help more people find you',
    ],
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  outbox: {
    icon: Send,
    title: 'Outbox (Write) Relays',
    shortDesc: 'Where you publish',
    longDesc: 'These are relays where your posts are published. When you write something, it gets sent to these relays so others can see it.',
    tips: [
      'Use 2-4 outbox relays for redundancy',
      'Fast relays make posting feel snappier',
      'Choose relays your followers can access',
    ],
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  dm: {
    icon: MessageSquare,
    title: 'DM (Direct Message) Relays',
    shortDesc: 'For private messages',
    longDesc: 'Special relays just for your encrypted direct messages. Keeping DMs on separate relays improves privacy and makes messaging more reliable.',
    tips: [
      '1-3 DM relays is plenty',
      'Look for relays that support NIP-17',
      'Some relays specialize in private messaging',
    ],
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  search: {
    icon: Search,
    title: 'Search Relays',
    shortDesc: 'For finding content',
    longDesc: 'Relays optimized for searching. When you search for posts, hashtags, or users, your client queries these relays. They index lots of content to help you find things.',
    tips: [
      '1-2 search relays is usually enough',
      'nostr.wine and nos.today are popular choices',
      'Search relays may have different content',
    ],
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  indexer: {
    icon: Database,
    title: 'Indexer Relays',
    shortDesc: 'For profile discovery',
    longDesc: 'Specialized relays that index user profiles (kind 0) and relay lists (kind 10002). Clients use these to quickly find information about users without querying many relays.',
    tips: [
      'purplepag.es is the most popular indexer',
      'Helps clients find your profile faster',
      '1-3 indexer relays is recommended',
    ],
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  proxy: {
    icon: Share2,
    title: 'Proxy Relays',
    shortDesc: 'Aggregator relays',
    longDesc: 'Proxy relays aggregate content from multiple other relays. They can help you access content from relays you\'re not directly connected to, acting as a bridge.',
    tips: [
      'Useful for discovering more content',
      'Can reduce the number of direct connections',
      'May have higher latency',
    ],
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  broadcast: {
    icon: Radio,
    title: 'Broadcast Relays',
    shortDesc: 'For wide distribution',
    longDesc: 'Relays specifically for broadcasting your events widely. When you want maximum reach for your posts, broadcast relays help ensure your content spreads across the network.',
    tips: [
      'Good for announcements and important posts',
      'sendit.nosflare.com is a popular choice',
      'Use sparingly to avoid spam',
    ],
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  trusted: {
    icon: ShieldCheck,
    title: 'Trusted Relays',
    shortDesc: 'Privacy-safe relays',
    longDesc: 'Relays you trust with your IP address and connection metadata. Some clients use this list to decide which relays can see your real IP vs. those accessed through Tor or a proxy.',
    tips: [
      'Only add relays you truly trust',
      'Consider the relay operator\'s reputation',
      'Useful for privacy-focused setups',
    ],
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  blocked: {
    icon: Ban,
    title: 'Blocked Relays',
    shortDesc: 'Relays to avoid',
    longDesc: 'Relays your client should never connect to. Use this to block relays with spam, illegal content, or that you simply don\'t want to interact with.',
    tips: [
      'Blocking is permanent until you remove it',
      'Useful for avoiding problematic relays',
      'Your client will refuse to connect to these',
    ],
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
};

export function RelayTypeExplainer({
  type,
  variant = 'tooltip',
  className,
}: RelayTypeExplainerProps) {
  const info = relayTypeInfo[type];
  const Icon = info.icon;

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-start gap-3 p-4 rounded-xl', info.bgColor, className)}>
        <div className={cn('p-2 rounded-lg bg-background/80', info.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{info.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {info.longDesc}
          </p>
          <ul className="mt-2 space-y-1">
            {info.tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-current" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className={cn('inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors', className)}>
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium text-sm">{info.title}</p>
          <p className="text-xs text-muted-foreground">{info.shortDesc}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Full explanation dialog for all relay types
 */
export function RelayTypesGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10">
          <HelpCircle className="w-3.5 h-3.5" />
          What are these relay types?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            Understanding Relay Types
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Nostr uses different types of relays for different purposes. Here's what each type does.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Core Relays</p>
          <RelayTypeExplainerDark type="inbox" />
          <RelayTypeExplainerDark type="outbox" />
          <RelayTypeExplainerDark type="dm" />
          <RelayTypeExplainerDark type="search" />

          <p className="text-xs text-white/40 uppercase tracking-wide font-medium pt-2">Specialized Relays</p>
          <RelayTypeExplainerDark type="indexer" />
          <RelayTypeExplainerDark type="proxy" />
          <RelayTypeExplainerDark type="broadcast" />
          <RelayTypeExplainerDark type="trusted" />
          <RelayTypeExplainerDark type="blocked" />

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm">
            <p className="font-medium mb-2 text-amber-400">Pro tip</p>
            <p className="text-white/60">
              You don't need many relays! Having 2-4 relays of each type is usually plenty.
              Too many relays can actually slow things down without adding much benefit.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dark theme version of relay type explainer for the modal
 */
function RelayTypeExplainerDark({ type }: { type: RelayType }) {
  const info = relayTypeInfo[type];
  const Icon = info.icon;

  const darkColors: Record<RelayType, string> = {
    inbox: 'bg-violet-500/20 border-violet-500/30 text-violet-400',
    outbox: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    dm: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
    search: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    indexer: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    proxy: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    broadcast: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
    trusted: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    blocked: 'bg-red-500/20 border-red-500/30 text-red-400',
  };

  return (
    <div className={cn('p-4 rounded-xl border', darkColors[type])}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-white/10 shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="font-semibold text-sm text-white">{info.title}</h4>
      </div>
      <p className="text-sm text-white/60 leading-relaxed mb-2">
        {info.longDesc}
      </p>
      <ul className="space-y-1">
        {info.tips.map((tip, i) => (
          <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
            <span className="w-1 h-1 rounded-full bg-current mt-1.5 shrink-0" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
