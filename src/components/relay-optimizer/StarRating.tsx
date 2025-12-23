import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  /** Current rating value (1-5) */
  value: number;
  /** Callback when rating changes (if interactive) */
  onChange?: (value: number) => void;
  /** Whether the rating is interactive */
  interactive?: boolean;
  /** Size of stars */
  size?: 'sm' | 'md' | 'lg';
  /** Show the numeric rating */
  showValue?: boolean;
  /** Number of reviews (shown next to rating) */
  reviewCount?: number;
  /** Additional class names */
  className?: string;
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StarRating({
  value,
  onChange,
  interactive = false,
  size = 'md',
  showValue = false,
  reviewCount,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value;
  const starSize = sizeClasses[size];

  const handleClick = (star: number) => {
    if (interactive && onChange) {
      onChange(star);
    }
  };

  const handleMouseEnter = (star: number) => {
    if (interactive) {
      setHoverValue(star);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverValue(null);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue;
          const isHalf = !isFilled && star - 0.5 <= displayValue;

          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              onMouseLeave={handleMouseLeave}
              disabled={!interactive}
              className={cn(
                'relative transition-transform',
                interactive && 'hover:scale-110 cursor-pointer',
                !interactive && 'cursor-default'
              )}
            >
              {/* Background star (empty) */}
              <Star
                className={cn(
                  starSize,
                  'text-white/20 stroke-white/30'
                )}
              />
              {/* Filled star overlay */}
              {(isFilled || isHalf) && (
                <Star
                  className={cn(
                    starSize,
                    'absolute inset-0 text-amber-400 fill-amber-400',
                    isHalf && 'clip-half'
                  )}
                  style={isHalf ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
                />
              )}
            </button>
          );
        })}
      </div>

      {showValue && value > 0 && (
        <span className="text-sm text-white/60 ml-1">
          {value.toFixed(1)}
        </span>
      )}

      {reviewCount !== undefined && (
        <span className="text-sm text-white/40 ml-1">
          ({reviewCount})
        </span>
      )}
    </div>
  );
}

interface CompactRatingProps {
  /** Average rating (0-1 scale) */
  rating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Additional class names */
  className?: string;
}

/**
 * Compact rating display showing stars and count
 */
export function CompactRating({ rating, reviewCount, className }: CompactRatingProps) {
  if (reviewCount === 0) {
    return (
      <span className={cn('text-xs text-white/40', className)}>
        No reviews
      </span>
    );
  }

  const stars = Math.round(rating * 5);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'w-3 h-3',
              star <= stars
                ? 'text-amber-400 fill-amber-400'
                : 'text-white/20 stroke-white/30'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-white/50">
        ({reviewCount})
      </span>
    </div>
  );
}
