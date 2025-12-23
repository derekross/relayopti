import { useState } from 'react';
import { X, ChevronDown, ChevronUp, ExternalLink, Shield, Zap, Globe, Info, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { InlineReviewSummary } from './RelayReviewsList';
import { RelayReviewDialog } from './RelayReviewDialog';
import { getLatencyDescription } from '@/lib/relay-utils';
import type { RelayStatusWithInfo } from '@/types/relay-optimizer';
import { getRelayDisplayUrl } from '@/lib/relay-utils';

interface RelayHealthCardProps {
  relay: RelayStatusWithInfo;
  read?: boolean;
  write?: boolean;
  onToggleRead?: () => void;
  onToggleWrite?: () => void;
  onRemove: () => void;
  type: 'nip65' | 'dm' | 'search';
  className?: string;
}

const typeGradients = {
  nip65: 'from-violet-500/20 via-purple-500/15 to-fuchsia-500/10',
  dm: 'from-pink-500/20 via-rose-500/15 to-red-500/10',
  search: 'from-emerald-500/20 via-teal-500/15 to-cyan-500/10',
};

const typeBorders = {
  nip65: 'border-violet-500/30 hover:border-violet-400/50',
  dm: 'border-pink-500/30 hover:border-pink-400/50',
  search: 'border-emerald-500/30 hover:border-emerald-400/50',
};

export function RelayHealthCard({
  relay,
  read,
  write,
  onToggleRead,
  onToggleWrite,
  onRemove,
  type,
  className,
}: RelayHealthCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const { nip11 } = relay;

  const displayUrl = getRelayDisplayUrl(relay.url);
  const hasNip11 = !!nip11;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          'group relative rounded-2xl border bg-gradient-to-br p-4 transition-all duration-200',
          'hover:shadow-lg hover:scale-[1.01]',
          typeGradients[type],
          typeBorders[type],
          className
        )}
      >
        {/* Main content */}
        <div className="flex items-start justify-between gap-3">
          {/* Relay info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Relay icon/avatar */}
              {nip11?.icon ? (
                <img
                  src={nip11.icon}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Globe className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Name or URL */}
              <h3 className="font-semibold text-sm truncate text-white">
                {nip11?.name || displayUrl}
              </h3>

              {/* Status badges */}
              {nip11?.limitation?.payment_required && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="gap-1 text-xs py-0 px-1.5 border-amber-500/50 text-amber-400">
                      <Zap className="w-3 h-3" />
                      Paid
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>This relay requires payment</TooltipContent>
                </Tooltip>
              )}

              {nip11?.limitation?.auth_required && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="gap-1 text-xs py-0 px-1.5 border-blue-500/50 text-blue-400">
                      <Shield className="w-3 h-3" />
                      Auth
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>This relay requires authentication</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* URL if name is different */}
            {nip11?.name && (
              <p className="text-xs text-white/50 truncate mb-2">
                {displayUrl}
              </p>
            )}

            {/* Ping indicator and reviews */}
            <div className="flex items-center gap-3 flex-wrap">
              <PingIndicator
                status={relay.status}
                latency={relay.latency}
                showLabel
                size="sm"
              />

              {relay.latency !== null && (
                <span className="text-xs text-white/50">
                  {getLatencyDescription(relay.latency)}
                </span>
              )}

              <span className="text-white/20">|</span>

              <InlineReviewSummary
                relayUrl={relay.url}
                onClick={() => setShowReviewDialog(true)}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Read/Write toggles for NIP-65 */}
            {type === 'nip65' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 w-10">Read</span>
                  <Switch
                    checked={read}
                    onCheckedChange={onToggleRead}
                    className="data-[state=checked]:bg-violet-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 w-10">Write</span>
                  <Switch
                    checked={write}
                    onCheckedChange={onToggleWrite}
                    className="data-[state=checked]:bg-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expand button for NIP-11 details */}
        {hasNip11 && (
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs text-white/50 hover:text-white hover:bg-white/5 gap-1"
            >
              <Info className="w-3 h-3" />
              {isExpanded ? 'Hide' : 'Show'} relay details
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          </CollapsibleTrigger>
        )}

        {/* Expanded NIP-11 details */}
        <CollapsibleContent>
          {nip11 && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
              {/* Description */}
              {nip11.description && (
                <p className="text-xs text-white/60 leading-relaxed">
                  {nip11.description}
                </p>
              )}

              {/* Supported NIPs */}
              {nip11.supported_nips && nip11.supported_nips.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1.5 text-white/80">Supported NIPs</p>
                  <div className="flex flex-wrap gap-1">
                    {nip11.supported_nips.slice(0, 12).map(nip => (
                      <Badge
                        key={nip}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 bg-white/10 text-white/70 border-0"
                      >
                        {nip}
                      </Badge>
                    ))}
                    {nip11.supported_nips.length > 12 && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-white/10 text-white/70 border-0">
                        +{nip11.supported_nips.length - 12} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Software info */}
              {(nip11.software || nip11.version) && (
                <div className="flex items-center gap-2 text-xs text-white/50">
                  {nip11.software && (
                    <a
                      href={nip11.software}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Software
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {nip11.version && <span>v{nip11.version}</span>}
                </div>
              )}

              {/* Countries/Languages */}
              {(nip11.relay_countries?.length || nip11.language_tags?.length) && (
                <div className="flex flex-wrap gap-2 text-xs text-white/50">
                  {nip11.relay_countries?.map(country => (
                    <span key={country} className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {country}
                    </span>
                  ))}
                  {nip11.language_tags?.map(lang => (
                    <Badge key={lang} variant="outline" className="text-[10px] border-white/20 text-white/60">
                      {lang}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Policies */}
              {(nip11.terms_of_service || nip11.privacy_policy || nip11.posting_policy) && (
                <div className="flex gap-3 text-xs">
                  {nip11.terms_of_service && (
                    <a
                      href={nip11.terms_of_service}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/50 hover:text-white transition-colors flex items-center gap-1"
                    >
                      Terms <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {nip11.privacy_policy && (
                    <a
                      href={nip11.privacy_policy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/50 hover:text-white transition-colors flex items-center gap-1"
                    >
                      Privacy <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Write review button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReviewDialog(true)}
                className="w-full mt-2 text-xs border-white/20 text-white/70 hover:bg-white/10 hover:text-white gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                Write a Review
              </Button>
            </div>
          )}
        </CollapsibleContent>

        {/* Review Dialog */}
        <RelayReviewDialog
          relayUrl={relay.url}
          isOpen={showReviewDialog}
          onClose={() => setShowReviewDialog(false)}
        />
      </div>
    </Collapsible>
  );
}
