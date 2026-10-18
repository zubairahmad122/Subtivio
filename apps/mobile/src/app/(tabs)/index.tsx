import { PLANS, SCRIPTS, type Project, type ProjectStatus } from '@subtivio/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { ChevronRight, Clapperboard, Plus, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useBackend, useProjects } from '@/features/projects/queries';
import { useSettings } from '@/features/settings/store';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

export default function HomeScreen() {
  const { data: projects, isPending } = useProjects();

  return (
    <Screen>
      <Header />
      <BackendStatus />
      <Hero />
      <UsageCard used={projects?.filter((p) => p.id !== 'demo').length ?? 0} />

      <View className="gap-3">
        <Text variant="overline">Recent</Text>
        {isPending ? (
          <ActivityIndicator className="py-8" />
        ) : projects?.length ? (
          projects.map((p) => <ProjectRow key={p.id} project={p} />)
        ) : (
          <Text variant="caption">No videos yet.</Text>
        )}
      </View>
    </Screen>
  );
}

function BackendStatus() {
  const { data: backend } = useBackend();
  if (!backend) return null;
  const text =
    backend.kind === 'demo'
      ? 'Demo mode · start the server (pnpm server) for real videos'
      : backend.health.transcription === 'demo'
        ? 'Server connected · demo transcripts until ASSEMBLYAI_API_KEY is set'
        : 'Server connected · AI transcription on';
  return (
    <View className="-mt-3 flex-row items-center gap-2">
      <View
        className={cn('h-2 w-2 rounded-full', backend.kind === 'server' ? 'bg-accent' : 'bg-muted')}
      />
      <Text variant="caption">{text}</Text>
    </View>
  );
}

function Header() {
  const plan = useSettings((s) => s.plan);
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="display">
        Subtivio<Text className="text-primary">.</Text>
      </Text>
      <Badge
        label={PLANS[plan].name.toUpperCase()}
        tone={plan === 'free' ? 'neutral' : 'primary'}
      />
    </View>
  );
}

function Hero() {
  return (
    <View className="overflow-hidden rounded-4xl">
      <LinearGradient
        colors={['#F4B740', '#E07A2E', '#9A3B1B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 24, gap: 18 }}
      >
        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={14} color="#1A1206" />
            <Text className="font-semibold text-xs uppercase tracking-[1.5px] text-[#1A1206]/80">
              Apni zubaan mein
            </Text>
          </View>
          <Text className="font-display text-[28px] leading-[34px] tracking-tight text-[#1A1206]">
            Captions that sound right.
          </Text>
          <Text className="text-[15px] leading-[22px] text-[#1A1206]/75">
            Roman Urdu, Nastaliq or Hindi from one recording, with word-by-word highlight.
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/project/new')}
          className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#1A1206] active:opacity-90"
        >
          <Plus size={20} color="#F6F2EA" strokeWidth={2.5} />
          <Text className="font-semibold text-base text-[#F6F2EA]">New captions</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

function UsageCard({ used }: { used: number }) {
  const plan = PLANS[useSettings((s) => s.plan)];
  const left = Math.max(plan.videosPerMonth - used, 0);
  const ratio = Math.min(used / plan.videosPerMonth, 1);

  return (
    <Card className="gap-4">
      <View className="flex-row items-end justify-between">
        <View className="gap-1">
          <Text variant="overline">This month</Text>
          <Text variant="heading">
            {left} of {plan.videosPerMonth} videos left
          </Text>
        </View>
        {plan.id === 'free' ? (
          <Button
            size="sm"
            variant="secondary"
            label="Upgrade"
            onPress={() => router.push('/paywall')}
          />
        ) : null}
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-elevated">
        <View className="h-full rounded-full bg-primary" style={{ width: `${ratio * 100}%` }} />
      </View>
    </Card>
  );
}

const STATUS: Record<
  ProjectStatus,
  { label: string; tone: 'neutral' | 'primary' | 'accent' | 'danger' }
> = {
  uploading: { label: 'Uploading', tone: 'neutral' },
  transcribing: { label: 'Listening…', tone: 'primary' },
  ready: { label: 'Ready', tone: 'accent' },
  rendering: { label: 'Rendering', tone: 'primary' },
  exported: { label: 'Exported', tone: 'accent' },
  failed: { label: 'Failed', tone: 'danger' },
};

function ProjectRow({ project }: { project: Project }) {
  const { colors } = useTheme();
  const status = STATUS[project.status];

  return (
    <Link href={{ pathname: '/project/[id]', params: { id: project.id } }} asChild>
      <Pressable className="flex-row items-center gap-4 rounded-3xl border border-border bg-surface p-3 active:bg-elevated">
        <View className="h-16 w-12 items-center justify-center rounded-xl bg-elevated">
          <Clapperboard size={20} color={colors.muted} />
        </View>
        <View className="flex-1 gap-1.5">
          <Text variant="label" numberOfLines={1}>
            {project.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <Badge label={status.label} tone={status.tone} />
            <Text variant="caption">
              {SCRIPTS[project.script].label} · {Math.round(project.durationSec)}s
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.muted} />
      </Pressable>
    </Link>
  );
}
