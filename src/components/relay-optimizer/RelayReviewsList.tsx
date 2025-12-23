import { useState } from 'react';
import { MessageSquare, ChevronDown, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarRating, CompactRating } from './StarRating';
import { RelayReviewDialog } from './RelayReviewDialog';
import { useRelayReviews, ratingToStars } from '@/hooks/useRelayReviews';
import { useAuthor } from '@/hooks/useAuthor';
import { cn } from '@/lib/utils';
import type { RelayReview } from '@/types/relay-optimizer';

interface RelayReviewsListProps {
  relayUrl: string;
  className?: string;
}

/**
 * Full reviews list with dialog for viewing all reviews
 */
export function RelayReviewsList({ relayUrl, className }: RelayReviewsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const { data: reviewData, isLoading } = useRelayReviews(relayUrl);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-4 w-24 bg-white/5" />
        <Skeleton className="h-16 w-full bg-white/5" />
      </div>
    );
  }

  if (!reviewData || reviewData.reviewCount === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">No reviews yet</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReviewDialog(true)}
            className="h-6 px-2 text-xs text-violet-400 hover:text-violet-300 hover:bg-white/5"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Review
          </Button>
        </div>
        <RelayReviewDialog
          relayUrl={relayUrl}
          isOpen={showReviewDialog}
          onClose={() => setShowReviewDialog(false)}
        />
      </div>
    );
  }

  const { averageRating, reviewCount, reviews } = reviewData;
  const previewReviews = reviews.slice(0, 2);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CompactRating rating={averageRating} reviewCount={reviewCount} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReviewDialog(true)}
          className="h-6 px-2 text-xs text-violet-400 hover:text-violet-300 hover:bg-white/5"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Review
        </Button>
      </div>

      {/* Preview reviews */}
      <div className="space-y-2">
        {previewReviews.map((review) => (
          <ReviewCard key={review.id} review={review} compact />
        ))}
      </div>

      {/* Show more button */}
      {reviewCount > 2 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="w-full h-7 text-xs text-white/50 hover:text-white hover:bg-white/5"
        >
          View all {reviewCount} reviews
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      )}

      {/* Full reviews dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              Reviews
              <span className="text-sm font-normal text-white/50">
                ({reviewCount})
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="flex items-center gap-4 py-3 border-b border-white/10">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {(averageRating * 5).toFixed(1)}
              </div>
              <StarRating value={ratingToStars(averageRating)} size="sm" />
            </div>
            <div className="text-sm text-white/50">
              Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Reviews list */}
          <div className="flex-1 overflow-y-auto space-y-3 py-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add review dialog */}
      <RelayReviewDialog
        relayUrl={relayUrl}
        isOpen={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
      />
    </div>
  );
}

interface ReviewCardProps {
  review: RelayReview;
  compact?: boolean;
}

function ReviewCard({ review, compact = false }: ReviewCardProps) {
  const { data: authorData } = useAuthor(review.pubkey);
  const metadata = authorData?.metadata;

  const displayName = metadata?.display_name || metadata?.name || review.pubkey.slice(0, 8);
  const timeAgo = formatDistanceToNow(review.createdAt * 1000, { addSuffix: true });

  if (compact) {
    return (
      <div className="p-2 rounded-lg bg-white/5 border border-white/5">
        <div className="flex items-start gap-2">
          <Avatar className="w-6 h-6 flex-shrink-0">
            {metadata?.picture && <AvatarImage src={metadata.picture} />}
            <AvatarFallback className="bg-violet-500/20 text-violet-300 text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white/80 truncate">
                {displayName}
              </span>
              <StarRating value={ratingToStars(review.rating)} size="sm" />
            </div>
            <p className="text-xs text-white/50 line-clamp-2 mt-0.5">
              {review.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          {metadata?.picture && <AvatarImage src={metadata.picture} />}
          <AvatarFallback className="bg-violet-500/20 text-violet-300">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-white truncate">
              {displayName}
            </span>
            <span className="text-xs text-white/40 flex-shrink-0">
              {timeAgo}
            </span>
          </div>
          <StarRating value={ratingToStars(review.rating)} size="sm" className="mt-1" />
          <p className="text-sm text-white/70 mt-2 whitespace-pre-wrap">
            {review.content}
          </p>
        </div>
      </div>
    </div>
  );
}

interface InlineReviewSummaryProps {
  relayUrl: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact inline review summary for relay cards
 */
export function InlineReviewSummary({ relayUrl, onClick, className }: InlineReviewSummaryProps) {
  const { data: reviewData, isLoading } = useRelayReviews(relayUrl);

  if (isLoading) {
    return <Skeleton className={cn('h-4 w-16 bg-white/5', className)} />;
  }

  if (!reviewData || reviewData.reviewCount === 0) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'text-xs text-white/40 hover:text-violet-400 transition-colors',
          className
        )}
      >
        No reviews
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 hover:opacity-80 transition-opacity',
        className
      )}
    >
      <CompactRating
        rating={reviewData.averageRating}
        reviewCount={reviewData.reviewCount}
      />
    </button>
  );
}
