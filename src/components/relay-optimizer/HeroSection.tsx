import { Radio, Zap, Users, Shield, Globe, ArrowRight, Activity, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoginArea } from '@/components/auth/LoginArea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLoginActions } from '@/hooks/useLoginActions';
import type { NostrMetadata } from '@nostrify/nostrify';

interface HeroSectionProps {
  isLoggedIn: boolean;
  userMetadata?: NostrMetadata;
  className?: string;
}

export function HeroSection({
  isLoggedIn,
  userMetadata,
  className,
}: HeroSectionProps) {
  const { logout } = useLoginActions();

  // Logged in - compact header
  if (isLoggedIn && userMetadata) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl p-8 md:p-12',
          'bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600',
          className
        )}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="absolute top-4 right-4 z-20 text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <Avatar className="w-20 h-20 border-4 border-white/20 shadow-xl">
            {userMetadata.picture && (
              <AvatarImage src={userMetadata.picture} />
            )}
            <AvatarFallback className="bg-white/20 text-white text-2xl">
              {(userMetadata.display_name || userMetadata.name || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Hey, {userMetadata.display_name || userMetadata.name || 'friend'}!
            </h1>
            <p className="text-white/80 text-lg max-w-xl">
              Let's optimize your relay setup. We'll check your current relays,
              see what your friends are using, and help you find the best connections.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged out - full screen onboarding
  return (
    <div
      className={cn(
        'relative min-h-screen flex flex-col',
        'bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950',
        className
      )}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Floating relay icons */}
        <div className="absolute top-20 left-[15%] animate-bounce-slow opacity-20">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="absolute top-32 right-[20%] animate-bounce-slow opacity-20" style={{ animationDelay: '0.5s' }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="absolute bottom-40 left-[10%] animate-bounce-slow opacity-20" style={{ animationDelay: '1s' }}>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
        </div>
        <div className="absolute bottom-32 right-[15%] animate-bounce-slow opacity-20" style={{ animationDelay: '1.5s' }}>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight max-w-4xl">
          Supercharge your
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400">
            Nostr experience
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-2xl leading-relaxed">
          The easiest way to optimize your relay connections. Discover what relays your friends use,
          test performance, and publish your configuration in one click.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <LoginArea className="justify-center" />
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Speed Test"
            description="Ping test all your relays instantly"
            color="amber"
          />
          <FeatureCard
            icon={<Users className="w-5 h-5" />}
            title="Friend Analysis"
            description="See which relays your contacts use"
            color="violet"
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="One-Click Publish"
            description="Update your relay list on Nostr"
            color="emerald"
          />
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="relative z-10 flex justify-center pb-12">
        <div className="flex flex-col items-center gap-2 text-white/60">
          <span className="text-sm font-medium">Log in to get started</span>
          <ArrowRight className="w-5 h-5 rotate-90 animate-bounce text-violet-400" />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'amber' | 'violet' | 'emerald';
}) {
  const colorClasses = {
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/20 text-amber-400',
    violet: 'from-violet-500/20 to-purple-500/20 border-violet-500/20 text-violet-400',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/20 text-emerald-400',
  };

  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl border backdrop-blur-sm',
        'bg-gradient-to-br',
        'transition-all duration-300 hover:scale-105 hover:border-opacity-50',
        colorClasses[color]
      )}
    >
      <div className={cn('mb-3', colorClasses[color].split(' ').pop())}>
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-white/50">{description}</p>
    </div>
  );
}
