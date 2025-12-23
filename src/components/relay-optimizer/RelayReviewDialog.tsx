import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarRating } from './StarRating';
import { useSubmitRelayReview } from '@/hooks/useRelayReviews';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface RelayReviewDialogProps {
  relayUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RelayReviewDialog({ relayUrl, isOpen, onClose }: RelayReviewDialogProps) {
  const [rating, setRating] = useState(3);
  const [content, setContent] = useState('');
  const { user } = useCurrentUser();
  const { mutateAsync: submitReview, isPending } = useSubmitRelayReview();

  // Extract display name from relay URL
  const relayDisplayName = relayUrl.replace('wss://', '').replace('ws://', '').replace(/\/$/, '');

  const handleSubmit = async () => {
    if (!content.trim() || rating === 0) return;

    try {
      await submitReview({
        relayUrl,
        rating,
        content: content.trim(),
      });
      // Reset form and close
      setRating(3);
      setContent('');
      onClose();
    } catch {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    // Reset form on close
    setRating(3);
    setContent('');
    onClose();
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Login Required</DialogTitle>
            <DialogDescription className="text-white/60">
              You need to be logged in to submit a review.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            Review Relay
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Share your experience with <span className="text-violet-400 font-mono">{relayDisplayName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Rating
            </label>
            <div className="flex items-center gap-3">
              <StarRating
                value={rating}
                onChange={setRating}
                interactive
                size="lg"
              />
              <span className="text-sm text-white/50">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Your Review
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience with this relay... (reliability, speed, policies, etc.)"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-violet-500 min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-white/40 text-right">
              {content.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !content.trim()}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
          >
            {isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
