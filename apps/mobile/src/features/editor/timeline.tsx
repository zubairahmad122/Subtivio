import type { CaptionLine } from '@subtivio/core';
import { useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

type TimelineProps = {
  lines: readonly CaptionLine[];
  duration: number;
  time: number;
  activeLineId?: string;
  onSeek: (time: number) => void;
};

const format = (t: number) =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/**
 * Caption lines laid out on the video's time axis with a playhead. Tap or
 * drag anywhere to seek.
 */
export function Timeline({ lines, duration, time, activeLineId, onSeek }: TimelineProps) {
  const [width, setWidth] = useState(0);
  const span = Math.max(duration, 0.1);

  const seekTo = (e: GestureResponderEvent) => {
    if (width === 0) return;
    const x = Math.min(Math.max(e.nativeEvent.locationX, 0), width);
    onSeek((x / width) * span);
  };

  return (
    <View className="gap-1.5">
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="Timeline"
        accessibilityValue={{ min: 0, max: Math.round(span), now: Math.round(time) }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={seekTo}
        onResponderMove={seekTo}
        className="h-11 justify-center overflow-hidden rounded-xl bg-elevated"
      >
        {/* Children must not steal touches, so locationX stays relative to the bar. */}
        <View pointerEvents="none" className="absolute inset-0">
          {lines.map((line) => (
            <View
              key={line.id}
              className={cn(
                'absolute bottom-2 top-2 rounded-md',
                line.id === activeLineId ? 'bg-primary' : 'bg-primary/35',
              )}
              style={{
                left: `${(line.start / span) * 100}%`,
                width: `${Math.max(((line.end - line.start) / span) * 100, 0.6)}%`,
              }}
            />
          ))}
          <View
            className="absolute bottom-0 top-0 w-0.5 bg-foreground"
            style={{ left: `${Math.min(time / span, 1) * 100}%` }}
          />
        </View>
      </View>
      <View className="flex-row justify-between px-0.5">
        <Text variant="caption" className="tabular-nums">
          {format(time)}
        </Text>
        <Text variant="caption" className="tabular-nums">
          {format(span)}
        </Text>
      </View>
    </View>
  );
}
