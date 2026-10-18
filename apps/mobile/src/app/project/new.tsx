import { PLANS, type Script, type SpokenLanguage } from '@lafz/core';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Film, Play, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { ScriptToggle } from '@/features/captions/script-toggle';
import { useCreateProject } from '@/features/projects/queries';
import { useSettings } from '@/features/settings/store';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

type PickedVideo = { uri: string; name: string; durationSec: number };

export default function NewProjectScreen() {
  const { colors } = useTheme();
  const plan = PLANS[useSettings((s) => s.plan)];
  const createProject = useCreateProject();

  const [video, setVideo] = useState<PickedVideo>();
  const [error, setError] = useState<string>();
  const [language, setLanguage] = useState<SpokenLanguage>('ur');
  const [script, setScript] = useState<Script>('roman');

  async function pickVideo() {
    setError(undefined);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: plan.maxVideoSeconds,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    const durationSec = (asset.duration ?? 0) / 1000;
    if (durationSec > plan.maxVideoSeconds) {
      setError(`${plan.name} plan videos can be up to ${plan.maxVideoSeconds}s.`);
      return;
    }
    setVideo({ uri: asset.uri, name: asset.fileName ?? 'Video', durationSec });
  }

  function generate() {
    if (!video) return;
    createProject.mutate(
      {
        title: video.name.replace(/\.[^.]+$/, ''),
        videoUri: video.uri,
        durationSec: video.durationSec,
        language,
        script,
      },
      {
        onSuccess: (project) =>
          router.replace({ pathname: '/project/[id]', params: { id: project.id } }),
      },
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between">
        <Text variant="title">New captions</Text>
        <Button
          variant="ghost"
          size="icon"
          icon={X}
          accessibilityLabel="Close"
          onPress={() => router.back()}
        />
      </View>

      <Pressable
        onPress={pickVideo}
        className={cn(
          'items-center justify-center gap-3 rounded-4xl border-2 border-dashed p-8 active:bg-elevated',
          video ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-elevated">
          <Film size={26} color={video ? colors.primary : colors.muted} />
        </View>
        <Text variant="heading" numberOfLines={1}>
          {video ? video.name : 'Choose a reel'}
        </Text>
        <Text variant="caption">
          {video
            ? `${Math.round(video.durationSec)}s · tap to change`
            : `Up to ${plan.maxVideoSeconds}s on the ${plan.name} plan`}
        </Text>
      </Pressable>
      {error ? <Text className="-mt-3 text-sm text-danger">{error}</Text> : null}

      <View className="gap-3">
        <Text variant="overline">Spoken language</Text>
        <SegmentedControl
          value={language}
          onChange={setLanguage}
          segments={[
            { value: 'ur', label: 'Urdu' },
            { value: 'pa', label: 'Punjabi mix' },
            { value: 'hi', label: 'Hindi' },
          ]}
        />
      </View>

      <View className="gap-3">
        <Text variant="overline">Captions in</Text>
        <ScriptToggle value={script} onChange={setScript} />
        <Text variant="caption">You can switch script any time in the editor.</Text>
      </View>

      <View className="gap-3">
        <Button
          size="lg"
          label="Generate captions"
          disabled={!video}
          loading={createProject.isPending}
          onPress={generate}
        />
        <Button
          variant="ghost"
          icon={Play}
          label="Try the sample clip"
          onPress={() => router.replace({ pathname: '/project/[id]', params: { id: 'demo' } })}
        />
      </View>
    </Screen>
  );
}
