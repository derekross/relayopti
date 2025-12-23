import { useState } from 'react';
import { Inbox, Send, Check, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PingIndicator } from './PingIndicator';
import { InlineReviewSummary } from './RelayReviewsList';
import type { RelayStatusWithInfo } from '@/types/relay-optimizer';
import { getRelayDisplayUrl } from '@/lib/relay-utils';

interface TopRelaySuggestionCardProps {
  url: string;
  relayStatus?: RelayStatusWithInfo;
  onAddToInbox: () => void;
  onAddToOutbox: () => void;
  alreadyUsed?: boolean;
  className?: string;
}

export function TopRelaySuggestionCard({
  url,
  relayStatus,
  onAddToInbox,
  onAddToOutbox,
  alreadyUsed = false,
  className,
}: TopRelaySuggestionCardProps) {
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  const displayUrl = getRelayDisplayUrl(url);
  const nip11 = relayStatus?.nip11;
  const displayName = nip11?.name || displayUrl;

  const handleAdd = (type: 'inbox' | 'outbox') => {
    if (type === 'inbox') {
      onAddToInbox();
    } else {
      onAddToOutbox();
    }
    setAddedTo(prev => new Set([...prev, type]));
  };

  // If already used, show a muted card
  if (alreadyUsed) {
    return (
      <div
        className={cn(
          'relative rounded-2xl border border-white/10 bg-white/5 p-4',
          'opacity-60',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {nip11?.icon ? (
              <img
                src={nip11.icon}
                alt=""
                className="w-6 h-6 rounded-full object-cover grayscale"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-white/50" />
              </div>
            )}
            <span className="text-sm font-medium text-white/50">
              {displayName}
            </span>
          </div>
          <Badge variant="secondary" className="gap-1 bg-white/10 text-white/60 border-0">
            <Check className="w-3 h-3" />
            Already added
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-gradient-to-br p-4 transition-all duration-200',
        'from-emerald-500/15 via-teal-500/10 to-cyan-500/5',
        'border-emerald-500/30 hover:border-emerald-400/50',
        'hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.01]',
        className
      )}
    >
      {/* Main content */}
      <div className="flex items-start justify-between gap-3">
        {/* Relay info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {nip11?.icon ? (
              <img
                src={nip11.icon}
                alt=""
                className="w-8 h-8 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold">
                  {displayUrl.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm text-white">{displayName}</h3>
              {nip11?.name && (
                <p className="text-xs text-white/50">{displayUrl}</p>
              )}
            </div>
          </div>

          {/* Top relay badge */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Top online relay</span>
            </div>

            {/* Show status if available */}
            {relayStatus && (
              <PingIndicator
                status={relayStatus.status}
                latency={relayStatus.latency}
                size="sm"
              />
            )}

            {/* Reviews */}
            <InlineReviewSummary relayUrl={url} />
          </div>

          {/* Source badge */}
          <div className="mt-2">
            <Badge variant="outline" className="text-xs border-white/20 text-white/60">
              From nostr.watch
            </Badge>
          </div>

          {/* Description if available */}
          {nip11?.description && (
            <p className="text-xs text-white/50 mt-2 line-clamp-2">
              {nip11.description}
            </p>
          )}
        </div>

        {/* Add buttons */}
        <div className="flex flex-col gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={addedTo.has('inbox') ? 'secondary' : 'outline'}
                onClick={() => handleAdd('inbox')}
                disabled={addedTo.has('inbox')}
                className={cn(
                  'gap-1.5 text-xs',
                  addedTo.has('inbox')
                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                    : 'border-white/20 text-white/70 hover:bg-violet-500/20 hover:text-violet-300 hover:border-violet-500/50'
                )}
              >
                {addedTo.has('inbox') ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Inbox className="w-3 h-3" />
                )}
                Inbox
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add to your read/inbox relays</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={addedTo.has('outbox') ? 'secondary' : 'outline'}
                onClick={() => handleAdd('outbox')}
                disabled={addedTo.has('outbox')}
                className={cn(
                  'gap-1.5 text-xs',
                  addedTo.has('outbox')
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'border-white/20 text-white/70 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/50'
                )}
              >
                {addedTo.has('outbox') ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                Outbox
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add to your write/outbox relays</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
