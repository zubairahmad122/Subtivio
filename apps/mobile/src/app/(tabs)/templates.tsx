import { SAMPLE_TRANSCRIPT, TEMPLATES, type Script } from '@lafz/core';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { CaptionStage } from '@/features/captions/caption-stage';
import { ScriptToggle } from '@/features/captions/script-toggle';

/** A moment in the sample where the first line shows with "batata" highlighted. */
const PREVIEW_TIME = 1.3;

export default function TemplatesScreen() {
  const [script, setScript] = useState<Script>('roman');

  return (
    <Screen>
      <View className="gap-1">
        <Text variant="title">Caption styles</Text>
        <Text variant="caption">Desi templates for news, cricket, naat, property and more.</Text>
      </View>
      <ScriptToggle value={script} onChange={setScript} />

      <View className="flex-row flex-wrap justify-between gap-y-5">
        {TEMPLATES.map((template) => (
          <View key={template.id} className="w-[48%] gap-2">
            <CaptionStage
              words={SAMPLE_TRANSCRIPT.words}
              script={script}
              template={template}
              time={PREVIEW_TIME}
              className="rounded-3xl"
            />
            <View className="flex-row items-center justify-between px-1">
              <View>
                <Text variant="label">{template.name}</Text>
                <Text variant="caption" className="capitalize">
                  {template.category}
                </Text>
              </View>
              {template.tier === 'pro' ? <Badge label="PRO" tone="primary" /> : null}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
