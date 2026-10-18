import { Pressable, View } from 'react-native';

import { tap } from '@/lib/haptics';
import { cn } from '@/lib/cn';

import { Text } from './text';

export type Segment<T extends string> = {
  value: T;
  label: string;
  /** Extra classes for the label, e.g. a script-specific font. */
  labelClassName?: string;
};

type SegmentedControlProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      className={cn('flex-row rounded-2xl border border-border bg-surface p-1', className)}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              tap();
              onChange(segment.value);
            }}
            className={cn(
              'h-10 flex-1 items-center justify-center rounded-xl',
              selected && 'bg-primary',
            )}
          >
            <Text
              numberOfLines={1}
              className={cn(
                'font-semibold text-sm',
                selected ? 'text-primary-foreground' : 'text-muted',
                segment.labelClassName,
              )}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
