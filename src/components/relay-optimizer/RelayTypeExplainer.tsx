import { Inbox, Send, MessageSquare, Search, HelpCircle } from 'lucide-react';
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

interface RelayTypeExplainerProps {
  type: 'inbox' | 'outbox' | 'dm' | 'search';
  variant?: 'tooltip' | 'inline';
  className?: string;
}

const relayTypeInfo = {
  inbox: {
    icon: Inbox,
    title: 'Inbox (Read) Relays',
    emoji: '',
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
    emoji: '',
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
    emoji: '',
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
    emoji: '',
    shortDesc: 'For finding content',
    longDesc: 'Relays optimized for searching. When you search for posts, hashtags, or users, your client queries these relays. They index lots of content to help you find things.',
    tips: [
      '1-2 search relays is usually enough',
      'relay.nostr.band is a popular choice',
      'Search relays may have different content',
    ],
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
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
          <RelayTypeExplainerDark type="inbox" />
          <RelayTypeExplainerDark type="outbox" />
          <RelayTypeExplainerDark type="dm" />
          <RelayTypeExplainerDark type="search" />

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
function RelayTypeExplainerDark({ type }: { type: 'inbox' | 'outbox' | 'dm' | 'search' }) {
  const info = relayTypeInfo[type];
  const Icon = info.icon;

  const darkColors = {
    inbox: 'bg-violet-500/20 border-violet-500/30 text-violet-400',
    outbox: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    dm: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
    search: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  };

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-xl border', darkColors[type])}>
      <div className="p-2 rounded-lg bg-white/10">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-sm mb-1 text-white">{info.title}</h4>
        <p className="text-sm text-white/60 leading-relaxed">
          {info.longDesc}
        </p>
        <ul className="mt-2 space-y-1">
          {info.tips.map((tip, i) => (
            <li key={i} className="text-xs text-white/50 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-current" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
