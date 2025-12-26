import { useState } from 'react';
import { Upload, Check, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PublishButtonProps {
  hasChanges: boolean;
  isPublishing: boolean;
  onPublish: () => Promise<void>;
  changesSummary?: {
    inbox: number;
    outbox: number;
    dm: number;
    search: number;
  };
  /** Validation errors that prevent publishing */
  validationErrors?: string[];
  className?: string;
}

export function PublishButton({
  hasChanges,
  isPublishing,
  onPublish,
  changesSummary,
  validationErrors = [],
  className,
}: PublishButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const hasValidationErrors = validationErrors.length > 0;
  const canPublish = hasChanges && !hasValidationErrors;

  const handlePublish = async () => {
    setShowConfirm(false);
    try {
      await onPublish();
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3000);
    } catch {
      // Error handling is done in the hook
    }
  };

  // Show button if there are changes OR validation errors (so user can see what's wrong)
  if (!hasChanges && !publishSuccess && !hasValidationErrors) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'animate-in slide-in-from-bottom-4 fade-in duration-300',
          className
        )}
      >
        <Button
          size="lg"
          onClick={() => setShowConfirm(true)}
          disabled={isPublishing || publishSuccess}
          className={cn(
            'gap-2 rounded-full px-6 shadow-xl transition-all',
            'hover:scale-105 hover:shadow-2xl',
            publishSuccess
              ? 'bg-green-500 hover:bg-green-500'
              : hasValidationErrors
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
              : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500'
          )}
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Publishing...
            </>
          ) : publishSuccess ? (
            <>
              <Check className="w-5 h-5" />
              Published!
            </>
          ) : hasValidationErrors ? (
            <>
              <AlertTriangle className="w-5 h-5" />
              Fix Issues to Publish
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Publish Changes
            </>
          )}
        </Button>

        {/* Pulse animation when there are changes and no errors */}
        {canPublish && !isPublishing && !publishSuccess && (
          <div className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-20 pointer-events-none" />
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Upload className="w-5 h-5 text-violet-500" />
              Publish Relay Changes
            </DialogTitle>
            <DialogDescription className="text-white/60">
              This will update your relay configuration on Nostr. Other clients
              will use these relays to find your content and send you messages.
            </DialogDescription>
          </DialogHeader>

          {changesSummary && (
            <div className="py-4 space-y-2">
              <p className="text-sm font-medium text-white">Changes to publish:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-white">
                {changesSummary.inbox > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-500/10">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    {changesSummary.inbox} inbox relay{changesSummary.inbox !== 1 ? 's' : ''}
                  </div>
                )}
                {changesSummary.outbox > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    {changesSummary.outbox} outbox relay{changesSummary.outbox !== 1 ? 's' : ''}
                  </div>
                )}
                {changesSummary.dm > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-pink-500/10">
                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                    {changesSummary.dm} DM relay{changesSummary.dm !== 1 ? 's' : ''}
                  </div>
                )}
                {changesSummary.search > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {changesSummary.search} search relay{changesSummary.search !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Validation errors */}
          {hasValidationErrors && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Cannot publish yet:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!hasValidationErrors && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                This will broadcast to your current relays. Make sure you have at
                least one working relay before publishing.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={hasValidationErrors}
              className={cn(
                'text-white',
                hasValidationErrors
                  ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600'
              )}
            >
              <Upload className="w-4 h-4 mr-2" />
              Publish to Nostr
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
