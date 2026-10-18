import { TEMPLATES } from '@subtivio/core';
import { Lock } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

type TemplatePickerProps = {
  value: string;
  onChange: (id: string) => void;
  /** Show a lock on Pro templates (they still preview; export asks to upgrade). */
  locked: boolean;
};

export function TemplatePicker({ value, onChange, locked }: TemplatePickerProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-0.5"
    >
      {TEMPLATES.map((t) => {
        const selected = t.id === value;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              tap();
              onChange(t.id);
            }}
            className={cn(
              'h-11 flex-row items-center gap-2 rounded-full border px-4',
              selected ? 'border-primary bg-primary/10' : 'border-border bg-surface',
            )}
          >
            <View
              className="h-3 w-3 rounded-full border border-border"
              style={{ backgroundColor: t.highlightColor }}
            />
            <Text
              className={cn('font-semibold text-sm', selected ? 'text-foreground' : 'text-muted')}
            >
              {t.name}
            </Text>
            {locked && t.tier === 'pro' ? <Lock size={12} color={colors.muted} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
