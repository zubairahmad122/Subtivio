import {
  applySpellingRules,
  applyStyle,
  DEFAULT_GROUPING,
  deleteLine,
  getTemplate,
  groupIntoLines,
  lineAt,
  PLANS,
  retextLine,
  shiftLine,
  splitLineAt,
  transcriptDuration,
  type Project,
  type Transcript,
} from '@subtivio/core';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { VideoView } from 'expo-video';
import {
  AlertTriangle,
  ArrowLeft,
  AudioLines,
  Check,
  Download,
  ExternalLink,
  Info,
  Pause,
  Play,
  Redo2,
  Trash2,
  Undo2,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { CaptionStage } from '@/features/captions/caption-stage';
import { LineList, type LineActions } from '@/features/captions/line-list';
import { ScriptToggle } from '@/features/captions/script-toggle';
import { TemplatePicker } from '@/features/captions/template-picker';
import { usePlaybackClock } from '@/features/captions/use-playback-clock';
import { useVideoClock } from '@/features/captions/use-video-clock';
import { StylePanel } from '@/features/editor/style-panel';
import { Timeline } from '@/features/editor/timeline';
import { useEditorHistory } from '@/features/editor/use-history';
import {
  useDeleteProject,
  useExportProject,
  useProject,
  useUpdateProject,
} from '@/features/projects/queries';
import { useSettings } from '@/features/settings/store';
import { cn } from '@/lib/cn';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/theme-provider';

type Clock = { time: number; playing: boolean; toggle: () => void; seek: (t: number) => void };

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isPending, error } = useProject(id);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {isPending ? (
        <ActivityIndicator className="flex-1" />
      ) : error || !project ? (
        <View className="gap-4 p-6">
          <Text>Couldn’t load this project. {error?.message}</Text>
          <Button variant="secondary" label="Back" onPress={goBack} />
        </View>
      ) : !project.transcript ? (
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
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const plan = PLANS[useSettings((s) => s.plan)];
  const rules = useSettings((s) => s.spellingRules);
  const update = useUpdateProject(project.id);
  const history = useEditorHistory(project, (patch) => update.mutate(patch));
  const exporter = useExportProject(project.id);
  const remover = useDeleteProject();
  const [tab, setTab] = useState<'captions' | 'style'>('captions');

  const baseTemplate = getTemplate(project.templateId);
  const template = applyStyle(baseTemplate, project.style);
  const words = applySpellingRules(transcript.words, rules, project.script);
  const lines = groupIntoLines(words, project.script, {
    ...DEFAULT_GROUPING,
    ...template.grouping,
  });
  const activeLine = lineAt(lines, clock.time);
  const duration = project.durationSec || transcriptDuration(transcript);
  const rendering = project.status === 'rendering' || exporter.isPending;

  const setWords = (next: Transcript['words']) =>
    history.apply({ transcript: { ...transcript, words: next } });

  // Lines are built from spelling-corrected words; edits apply to the raw
  // transcript, which has the same word ids and timings.
  const lineActions: LineActions = {
    onSeek: clock.seek,
    onSave: (line, text) => setWords(retextLine(transcript.words, line, text, project.script)),
    onSplit: (line, i) => setWords(splitLineAt(transcript.words, line, i)),
    onShift: (line, delta) => setWords(shiftLine(transcript.words, line, delta, duration)),
    onDelete: (line) => setWords(deleteLine(transcript.words, line)),
  };

  function exportVideo() {
    if (!plan.proTemplates && baseTemplate.tier === 'pro') {
      router.push('/paywall');
      return;
    }
    exporter.mutate({ watermark: plan.watermark, spellingRules: rules });
  }

  async function deleteProject() {
    if (!(await confirm('Delete this video?', 'The video and its captions are removed.', 'Delete')))
      return;
    remover.mutate(project.id, { onSuccess: goBack });
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
      <View className="flex-row items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          icon={clock.playing ? Pause : Play}
          accessibilityLabel={clock.playing ? 'Pause' : 'Play'}
          onPress={clock.toggle}
        />
        <View className="flex-1">
          <Timeline
            lines={lines}
            duration={duration}
            time={clock.time}
            activeLineId={activeLine?.id}
            onSeek={clock.seek}
          />
        </View>
      </View>
    </View>
  );

  const controls = (
    <View className="flex-1 gap-6">
      <ExportStatus project={project} rendering={rendering} error={exporter.error?.message} />
      <View className="gap-3">
        <Text variant="overline">Script</Text>
        <ScriptToggle value={project.script} onChange={(script) => history.apply({ script })} />
      </View>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'captions', label: 'Captions' },
          { value: 'style', label: 'Style' },
        ]}
      />
      {tab === 'captions' ? (
        <LineList
          lines={lines}
          script={project.script}
          activeLineId={activeLine?.id}
          {...lineActions}
        />
      ) : (
        <View className="gap-5">
          <TemplatePicker
            value={baseTemplate.id}
            locked={!plan.proTemplates}
            onChange={(templateId) => history.apply({ templateId })}
          />
          <StylePanel
            template={template}
            style={project.style ?? {}}
            showUppercase={project.script === 'roman'}
            onChange={(style) => history.apply({ style })}
          />
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1">
      <View className="w-full max-w-[1100px] flex-row items-center gap-1 self-center px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          icon={ArrowLeft}
          accessibilityLabel="Back"
          onPress={goBack}
        />
        <Text variant="heading" numberOfLines={1} className="flex-1">
          {project.title}
        </Text>
        <Button
          variant="ghost"
          size="icon"
          icon={Undo2}
          accessibilityLabel="Undo"
          disabled={!history.canUndo}
          onPress={history.undo}
        />
        <Button
          variant="ghost"
          size="icon"
          icon={Redo2}
          accessibilityLabel="Redo"
          disabled={!history.canRedo}
          onPress={history.redo}
        />
        <Button
          variant="ghost"
          size="icon"
          icon={Trash2}
          accessibilityLabel="Delete video"
          loading={remover.isPending}
          onPress={deleteProject}
        />
        <Button
          size="sm"
          icon={Download}
          label={rendering ? 'Rendering…' : 'Export'}
          loading={rendering}
          onPress={exportVideo}
        />
      </View>
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

/** Server messages for this project: render progress, the finished MP4, errors, notices. */
function ExportStatus({
  project,
  rendering,
  error,
}: {
  project: Project;
  rendering: boolean;
  error?: string;
}) {
  const problem = error ?? project.error;
  const ready = project.status === 'exported' && project.exportUrl;
  if (!rendering && !ready && !problem && !project.notice) return null;

  return (
    <View className="gap-2">
      {rendering ? (
        <Banner icon={Download} tone="primary">
          Rendering your video with captions… this takes about as long as the video itself.
        </Banner>
      ) : ready ? (
        <Card className="flex-row items-center gap-3 p-4">
          <View className="flex-1 gap-0.5">
            <Text variant="label">Your video is ready</Text>
            <Text variant="caption">MP4 with burned-in captions.</Text>
          </View>
          <Button
            size="sm"
            icon={ExternalLink}
            label="Open"
            onPress={() => WebBrowser.openBrowserAsync(project.exportUrl!)}
          />
        </Card>
      ) : null}
      {problem ? (
        <Banner icon={AlertTriangle} tone="danger">
          {problem}
        </Banner>
      ) : null}
      {project.notice ? (
        <Banner icon={Info} tone="muted">
          {project.notice}
        </Banner>
      ) : null}
    </View>
  );
}

function Banner({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: 'primary' | 'danger' | 'muted';
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const color =
    tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.muted;
  return (
    <View
      className={cn(
        'flex-row items-start gap-3 rounded-2xl p-3',
        tone === 'primary' && 'bg-primary/10',
        tone === 'danger' && 'bg-danger/10',
        tone === 'muted' && 'bg-elevated',
      )}
    >
      <Icon size={16} color={color} style={{ marginTop: 2 }} />
      <Text variant="caption" className="flex-1 text-foreground">
        {children}
      </Text>
    </View>
  );
}

const STEPS = ['Uploading video', 'Listening to the audio', 'Writing your captions'] as const;

/** Shown while the server transcribes. The query polls until captions exist. */
function Processing({ project }: { project: Project }) {
  const { colors } = useTheme();
  const remover = useDeleteProject();
  const failed = project.status === 'failed';
  const current = project.status === 'uploading' ? 0 : failed ? -1 : 1;

  return (
    <View className="flex-1 items-center justify-center gap-8 px-8">
      <View
        className={cn(
          'h-20 w-20 items-center justify-center rounded-3xl',
          failed ? 'bg-danger/15' : 'bg-primary/15',
        )}
      >
        {failed ? (
          <AlertTriangle size={36} color={colors.danger} />
        ) : (
          <AudioLines size={36} color={colors.primary} />
        )}
      </View>
      <View className="max-w-[360px] items-center gap-2">
        <Text variant="title">{failed ? 'Something went wrong' : 'Making captions'}</Text>
        <Text variant="caption" className="text-center">
          {failed ? project.error : 'Usually under a minute for a reel.'}
        </Text>
      </View>
      {failed ? (
        <View className="w-full max-w-[320px] gap-2">
          <Button
            variant="secondary"
            icon={Trash2}
            label="Delete and go back"
            loading={remover.isPending}
            onPress={() => remover.mutate(project.id, { onSuccess: goBack })}
          />
          <Button variant="ghost" label="Back" onPress={goBack} />
        </View>
      ) : (
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
      )}
    </View>
  );
}
