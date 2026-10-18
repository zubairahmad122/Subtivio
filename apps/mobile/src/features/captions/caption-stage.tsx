import {
  activeWordIndex,
  DEFAULT_GROUPING,
  groupIntoLines,
  lineAt,
  type CaptionTemplate,
  type Script,
  type Word,
} from '@subtivio/core';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

import { CaptionLineView } from './caption-line';

type CaptionStageProps = {
  words: readonly Word[];
  script: Script;
  template: CaptionTemplate;
  /** Playback position in seconds. */
  time: number;
  /** Video layer. Defaults to a placeholder gradient. */
  background?: ReactNode;
  watermark?: boolean;
  className?: string;
};

/** A 9:16 frame with the caption overlay positioned per the template. */
export function CaptionStage({
  words,
  script,
  template,
  time,
  background,
  watermark,
  className,
}: CaptionStageProps) {
  const [width, setWidth] = useState(0);
  const lines = groupIntoLines(words, script, { ...DEFAULT_GROUPING, ...template.grouping });
  const line = lineAt(lines, time);
  const height = (width * 16) / 9;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ aspectRatio: 9 / 16 }}
      className={cn('w-full overflow-hidden rounded-[28px] bg-black', className)}
    >
      {background ?? <StagePlaceholder />}

      {width > 0 && line ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: template.y * height }}
          className="items-center"
        >
          {/* Centre the caption block on the template's y line. */}
          <View style={{ transform: [{ translateY: '-50%' }] }}>
            <CaptionLineView
              key={line.id}
              line={line}
              activeIndex={activeWordIndex(line, time)}
              template={template}
              script={script}
              frameWidth={width}
            />
          </View>
        </View>
      ) : null}

      {watermark ? (
        <View className="absolute bottom-4 right-4 rounded-full bg-black/40 px-2.5 py-1">
          <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="text-[10px] text-white/80">
            Made with Subtivio
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function StagePlaceholder() {
  return (
    <LinearGradient
      colors={['#3A2A16', '#1A140D', '#0B0A09']}
      locations={[0, 0.55, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
