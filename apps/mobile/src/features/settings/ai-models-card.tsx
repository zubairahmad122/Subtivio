import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useBackend } from '@/features/projects/queries';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

type ModelStatus = {
  model: string;
  tier: 'flash' | 'flash-lite';
  requestsToday: number;
  tokensToday: number;
  dailyLimit: number;
  remaining: number;
  state: 'ready' | 'cooling-down' | 'used-up' | 'unavailable';
  availableAt?: string;
};

const STATE: Record<
  ModelStatus['state'],
  { label: string; tone: 'accent' | 'primary' | 'danger' | 'neutral' }
> = {
  ready: { label: 'READY', tone: 'accent' },
  'cooling-down': { label: 'RESTING', tone: 'primary' },
  'used-up': { label: 'USED UP', tone: 'danger' },
  unavailable: { label: 'N/A', tone: 'neutral' },
};

const time = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', weekday: 'short' });

/**
 * Free Gemini models on the server with today's usage. Remaining counts are
 * estimates: Google does not expose the real quota through the API.
 */
export function AiModelsCard() {
  const { data: backend } = useBackend();
  const { data } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => api<{ models: ModelStatus[] }>('/ai/models'),
    enabled: backend?.kind === 'server',
    refetchInterval: 30_000,
  });
  const models = data?.models ?? [];
  if (backend?.kind !== 'server' || models.length === 0) return null;

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="overline">AI models · Gemini free tier</Text>
        <Text variant="caption">
          Transcription uses Flash, script conversion uses Flash-Lite. When one runs out, the next
          takes over. Limits are estimates; AI Studio shows the exact quota.
        </Text>
      </View>
      <Card className="gap-4 p-4">
        {models.map((m) => {
          const ratio = Math.min(m.requestsToday / m.dailyLimit, 1);
          const state = STATE[m.state];
          return (
            <View key={m.model} className="gap-2">
              <View className="flex-row items-center justify-between gap-2">
                <Text variant="label" className="flex-1" numberOfLines={1}>
                  {m.model}
                </Text>
                <Badge label={state.label} tone={state.tone} />
              </View>
              <View className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <View
                  className={cn('h-full rounded-full', ratio > 0.9 ? 'bg-danger' : 'bg-primary')}
                  style={{ width: `${ratio * 100}%` }}
                />
              </View>
              <Text variant="caption">
                {m.requestsToday} / ~{m.dailyLimit} requests today ·{' '}
                {m.tokensToday.toLocaleString()} tokens
                {m.availableAt ? ` · back ${time(m.availableAt)}` : ''}
              </Text>
            </View>
          );
        })}
      </Card>
    </View>
  );
}
