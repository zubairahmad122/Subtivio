import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

const badgeVariants = cva('self-start rounded-full px-2.5 py-1', {
  variants: {
    tone: {
      neutral: 'bg-elevated',
      primary: 'bg-primary/15',
      accent: 'bg-accent/15',
      danger: 'bg-danger/15',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

const labelVariants = cva('font-semibold text-[11px] tracking-wide', {
  variants: {
    tone: {
      neutral: 'text-muted',
      primary: 'text-primary',
      accent: 'text-accent',
      danger: 'text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

type BadgeProps = VariantProps<typeof badgeVariants> & { label: string; className?: string };

export function Badge({ label, tone, className }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ tone }), className)}>
      <Text className={labelVariants({ tone })}>{label}</Text>
    </View>
  );
}
