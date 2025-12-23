import { useState } from 'react';
import { ChevronDown, ChevronUp, Users, Inbox, Send, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PingIndicator } from './PingIndicator';
import type { RelaySuggestion, RelayStatusWithInfo } from '@/types/relay-optimizer';
import { getRelayDisplayUrl } from '@/lib/relay-utils';

interface RelaySuggestionCardProps {
  suggestion: RelaySuggestion;
  relayStatus?: RelayStatusWithInfo;
  onAddToInbox: () => void;
  onAddToOutbox: () => void;
  onAddToDM?: () => void;
  className?: string;
}

export function RelaySuggestionCard({
  suggestion,
  relayStatus,
  onAddToInbox,
  onAddToOutbox,
  onAddToDM,
  className,
}: RelaySuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  const displayUrl = getRelayDisplayUrl(suggestion.url);
  const nip11 = relayStatus?.nip11;
  const displayName = nip11?.name || displayUrl;

  // Get friendly count text
  const friendText = suggestion.contactCount === 1
    ? '1 friend uses this'
    : `${suggestion.contactCount} friends use this`;

  const handleAdd = (type: 'inbox' | 'outbox' | 'dm') => {
    switch (type) {
      case 'inbox':
        onAddToInbox();
        break;
      case 'outbox':
        onAddToOutbox();
        break;
      case 'dm':
        onAddToDM?.();
        break;
    }
    setAddedTo(prev => new Set([...prev, type]));
  };

  // If already used, show a muted card
  if (suggestion.alreadyUsed) {
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
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          'group relative rounded-2xl border bg-gradient-to-br p-4 transition-all duration-200',
          'from-amber-500/15 via-orange-500/10 to-rose-500/5',
          'border-amber-500/30 hover:border-amber-400/50',
          'hover:shadow-lg hover:shadow-amber-500/10 hover:scale-[1.01]',
          className
        )}
      >
        {/* Popular badge */}
        {suggestion.contactCount >= 10 && (
          <div className="absolute -top-2 -right-2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
              Popular
            </Badge>
          </div>
        )}

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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
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

            {/* Friend count - the main selling point */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{friendText}</span>
              </div>

              {/* Show status if available */}
              {relayStatus && (
                <PingIndicator
                  status={relayStatus.status}
                  latency={relayStatus.latency}
                  size="sm"
                />
              )}
            </div>

            {/* Source badge */}
            <div className="mt-2">
              <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                {suggestion.source === 'nip65'
                  ? 'From NIP-65 relay lists'
                  : suggestion.source === 'profile'
                  ? 'From profile metadata'
                  : 'Multiple sources'}
              </Badge>
            </div>
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

            {onAddToDM && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={addedTo.has('dm') ? 'secondary' : 'outline'}
                    onClick={() => handleAdd('dm')}
                    disabled={addedTo.has('dm')}
                    className={cn(
                      'gap-1.5 text-xs',
                      addedTo.has('dm')
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                        : 'border-white/20 text-white/70 hover:bg-pink-500/20 hover:text-pink-300 hover:border-pink-500/50'
                    )}
                  >
                    {addedTo.has('dm') ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <MessageSquare className="w-3 h-3" />
                    )}
                    DM
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add to your DM relays</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Show friends who use this relay */}
        {suggestion.contacts.length > 0 && (
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs text-white/50 hover:text-white hover:bg-white/5 gap-1"
            >
              See who uses this relay
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          </CollapsibleTrigger>
        )}

        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex flex-wrap gap-2">
              {suggestion.contacts.slice(0, 20).map(contact => (
                <Tooltip key={contact.pubkey}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10">
                      <Avatar className="w-5 h-5">
                        {contact.picture && (
                          <AvatarImage src={contact.picture} />
                        )}
                        <AvatarFallback className="text-[10px] bg-white/10 text-white/70">
                          {(contact.displayName || contact.pubkey.slice(0, 2)).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate max-w-[100px] text-white/80">
                        {contact.displayName || contact.pubkey.slice(0, 8)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {contact.displayName || contact.pubkey.slice(0, 16) + '...'}
                  </TooltipContent>
                </Tooltip>
              ))}
              {suggestion.contacts.length > 20 && (
                <div className="flex items-center px-2 py-1 rounded-full bg-white/10">
                  <span className="text-xs text-white/50">
                    +{suggestion.contacts.length - 20} more
                  </span>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
