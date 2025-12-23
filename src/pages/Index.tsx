import { useSeoMeta } from '@unhead/react';
import { RelayOptimizerPage } from '@/components/relay-optimizer';

const Index = () => {
  useSeoMeta({
    title: 'Relay Optimizer - Optimize Your Nostr Relays',
    description: 'Analyze your Nostr relay connections, discover relays your friends use, and optimize your setup for faster, more reliable communication.',
  });

  return <RelayOptimizerPage />;
};

export default Index;
