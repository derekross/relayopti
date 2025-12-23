import { cn } from '@/lib/utils';
import type { RelayStatusType } from '@/types/relay-optimizer';

interface PingIndicatorProps {
  status: RelayStatusType;
  latency?: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<RelayStatusType, {
  emoji: string;
  color: string;
  bgColor: string;
  label: string;
}> = {
  good: {
    emoji: '🟢',
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    label: 'Fast',
  },
  ok: {
    emoji: '🟡',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    label: 'OK',
  },
  bad: {
    emoji: '🔴',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    label: 'Slow',
  },
  unknown: {
    emoji: '⚪',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Unknown',
  },
  testing: {
    emoji: '⏳',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400',
    label: 'Testing...',
  },
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function PingIndicator({
  status,
  latency,
  showLabel = false,
  size = 'md',
  className,
}: PingIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* Animated dot */}
      <div className="relative">
        <div
          className={cn(
            sizeClasses[size],
            'rounded-full',
            config.bgColor,
            status === 'testing' && 'animate-pulse',
            status === 'good' && 'animate-[pulse_2s_ease-in-out_infinite]'
          )}
        />
        {status === 'good' && (
          <div
            className={cn(
              sizeClasses[size],
              'absolute inset-0 rounded-full',
              config.bgColor,
              'animate-ping opacity-75'
            )}
          />
        )}
      </div>

      {/* Label and latency */}
      {(showLabel || latency !== undefined) && (
        <span className={cn('text-xs font-medium', config.color)}>
          {showLabel && config.label}
          {latency !== null && latency !== undefined && (
            <span className="ml-1 text-muted-foreground">
              {latency}ms
            </span>
          )}
        </span>
      )}
    </div>
  );
}
