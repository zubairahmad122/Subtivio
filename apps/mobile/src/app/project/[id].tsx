import {
  applySpellingRules,
  DEFAULT_GROUPING,
  getTemplate,
  groupIntoLines,
  lineAt,
  PLANS,
  retextLine,
  transcriptDuration,
  type CaptionLine,
  type Project,
  type Transcript,
} from '@lafz/core';
import { router, useLocalSearchParams } from 'expo-router';
import { VideoView } from 'expo-video';
import { ArrowLeft, AudioLines, Check, Download, Pause, Play, Upload } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CaptionStage } from '@/features/captions/caption-stage';
import { LineList } from '@/features/captions/line-list';
import { ScriptToggle } from '@/features/captions/script-toggle';
import { TemplatePicker } from '@/features/captions/template-picker';
import { usePlaybackClock } from '@/features/captions/use-playback-clock';
import { useVideoClock } from '@/features/captions/use-video-clock';
import { useProject, useUpdateProject } from '@/features/projects/queries';
import { useSettings } from '@/features/settings/store';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

type Clock = { time: number; playing: boolean; toggle: () => void; seek: (t: number) => void };

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isPending, error } = useProject(id);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {isPending ? (
        <ActivityIndicator className="flex-1" />
      ) : error || !project ? (
        <Text className="p-6">Couldn’t load this project.</Text>
      ) : project.status !== 'ready' || !project.transcript ? (
        <Processing project={project} />
      ) : project.videoUri ? (
        <VideoEditor project={project} transcript={project.transcript} uri={project.videoUri} />
      ) : (
        <SampleEditor project={project} transcript={project.transcript} />
      )}
    </SafeAreaView>
  );
}

function VideoEditor({ project, transcript, uri }: EditorProps & { uri: string }) {
  const { player, ...clock } = useVideoClock(uri);
  const background = (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      style={{ position: 'absolute', inset: 0 }}
    />
  );
  return <Editor project={project} transcript={transcript} clock={clock} background={background} />;
}

function SampleEditor({ project, transcript }: EditorProps) {
  const clock = usePlaybackClock(transcriptDuration(transcript));
  return <Editor project={project} transcript={transcript} clock={clock} />;
}

type EditorProps = { project: Project; transcript: Transcript };

function Editor({
  project,
  transcript,
  clock,
  background,
}: EditorProps & { clock: Clock; background?: ReactNode }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const plan = PLANS[useSettings((s) => s.plan)];
  const rules = useSettings((s) => s.spellingRules);
  const update = useUpdateProject(project.id);
  const [notice, setNotice] = useState<string>();

  const template = getTemplate(project.templateId);
  const words = applySpellingRules(transcript.words, rules, project.script);
  const lines = groupIntoLines(words, project.script, {
    ...DEFAULT_GROUPING,
    ...template.grouping,
  });
  const activeLine = lineAt(lines, clock.time);

  function saveLine(line: CaptionLine, text: string) {
    const edited = retextLine(transcript.words, line, text, project.script);
    update.mutate({ transcript: { ...transcript, words: edited } });
  }

  function exportVideo() {
    if (!plan.proTemplates && template.tier === 'pro') {
      router.push('/paywall');
      return;
    }
    setNotice('MP4 export runs on the render worker, which is the next build phase.');
  }

  const stage = (
    <View className={cn('gap-3', wide ? 'w-[360px]' : 'w-full max-w-[300px] self-center')}>
      <CaptionStage
        words={words}
        script={project.script}
        template={template}
        time={clock.time}
        background={background}
        watermark={plan.watermark}
      />
      <View className="flex-row items-center justify-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          icon={clock.playing ? Pause : Play}
          accessibilityLabel={clock.playing ? 'Pause' : 'Play'}
          onPress={clock.toggle}
        />
        <Text variant="caption" className="w-16 tabular-nums">
          {clock.time.toFixed(1)}s
        </Text>
      </View>
    </View>
  );

  const controls = (
    <View className="flex-1 gap-6">
      <View className="gap-3">
        <Text variant="overline">Script</Text>
        <ScriptToggle value={project.script} onChange={(script) => update.mutate({ script })} />
      </View>
      <View className="gap-3">
        <Text variant="overline">Style</Text>
        <TemplatePicker
          value={template.id}
          locked={!plan.proTemplates}
          onChange={(templateId) => update.mutate({ templateId })}
        />
      </View>
      <View className="gap-3">
        <Text variant="overline">Captions</Text>
        <LineList
          lines={lines}
          script={project.script}
          activeLineId={activeLine?.id}
          onSeek={clock.seek}
          onSave={saveLine}
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <View className="w-full max-w-[1100px] flex-row items-center gap-2 self-center px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          icon={ArrowLeft}
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <Text variant="heading" numberOfLines={1} className="flex-1">
          {project.title}
        </Text>
        <Button size="sm" icon={Download} label="Export" onPress={exportVideo} />
      </View>
      {notice ? (
        <Card className="mx-4 mb-2 flex-row items-center gap-3 self-center p-3">
          <Upload size={16} color={colors.primary} />
          <Text variant="caption" className="flex-1 text-foreground">
            {notice}
          </Text>
        </Card>
      ) : null}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          className={cn(
            'w-full max-w-[1100px] gap-8 self-center px-5 pb-16 pt-2',
            wide && 'flex-row items-start',
          )}
        >
          {stage}
          {controls}
        </View>
      </ScrollView>
    </View>
  );
}

const STEPS = ['Uploading video', 'Listening to the audio', 'Writing your captions'] as const;

/** Shown while the worker transcribes. The query polls until the project is ready. */
function Processing({ project }: { project: Project }) {
  const { colors } = useTheme();
  const current = project.status === 'uploading' ? 0 : project.status === 'failed' ? -1 : 1;

  return (
    <View className="flex-1 items-center justify-center gap-8 px-8">
      <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/15">
        <AudioLines size={36} color={colors.primary} />
      </View>
      <View className="items-center gap-2">
        <Text variant="title">
          {project.status === 'failed' ? 'Something went wrong' : 'Making captions'}
        </Text>
        <Text variant="caption">Usually under a minute for a reel.</Text>
      </View>
      <View className="w-full max-w-[320px] gap-3">
        {STEPS.map((step, i) => (
          <View key={step} className="flex-row items-center gap-3">
            <View className="h-6 w-6 items-center justify-center">
              {i < current ? (
                <Check size={18} color={colors.accent} />
              ) : i === current ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View className="h-2 w-2 rounded-full bg-border" />
              )}
            </View>
            <Text className={cn(i > current && 'text-muted')}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
