import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ViewProps) {
  return (
    <View className={cn('rounded-3xl border border-border bg-surface p-5', className)} {...props} />
  );
}
