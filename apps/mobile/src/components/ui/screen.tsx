import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  edges?: Edge[];
  className?: string;
}>;

/**
 * Page shell: safe areas, theme background, and a centred max-width column so
 * the same screens read well on phones and on desktop web.
 */
export function Screen({ children, scroll = true, edges = ['top'], className }: ScreenProps) {
  const content = (
    <View className={cn('w-full max-w-[720px] gap-6 self-center px-5 pb-28 pt-4', className)}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      {scroll ? (
        <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
