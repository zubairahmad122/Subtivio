import { PLANS } from '@lafz/core';
import { router } from 'expo-router';
import { Plus, ShieldCheck, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/features/settings/store';
import { useTheme } from '@/theme/theme-provider';

export default function SettingsScreen() {
  const plan = PLANS[useSettings((s) => s.plan)];

  return (
    <Screen>
      <Text variant="title">Settings</Text>

      <Card className="flex-row items-center justify-between">
        <View className="gap-1">
          <Text variant="overline">Plan</Text>
          <Text variant="heading">{plan.name}</Text>
          <Text variant="caption">
            {plan.videosPerMonth} videos / month{plan.watermark ? ' · watermark' : ''}
          </Text>
        </View>
        <Button size="sm" label="See plans" onPress={() => router.push('/paywall')} />
      </Card>

      <AppearanceSection />
      <SpellingSection />

      <Card className="flex-row gap-3">
        <ShieldCheck size={20} color={useTheme().colors.accent} />
        <View className="flex-1 gap-1">
          <Text variant="label">Your videos stay yours</Text>
          <Text variant="caption">
            Uploaded videos are deleted after 7 days and are never used to train AI models.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

function AppearanceSection() {
  const { setColorScheme } = useColorScheme();
  const mode = useSettings((s) => s.appearance);
  const setMode = useSettings((s) => s.setAppearance);

  return (
    <View className="gap-3">
      <Text variant="overline">Appearance</Text>
      <SegmentedControl
        value={mode}
        onChange={(next) => {
          setMode(next);
          setColorScheme(next);
        }}
        segments={[
          { value: 'system', label: 'System' },
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
      />
    </View>
  );
}

/**
 * The creator's own Roman Urdu spellings ("he" -> "hai"). Applied on top of
 * the AI pass, every time, in every project.
 */
function SpellingSection() {
  const { colors } = useTheme();
  const rules = useSettings((s) => s.spellingRules);
  const addRule = useSettings((s) => s.addRule);
  const removeRule = useSettings((s) => s.removeRule);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const canAdd = from.trim().length > 0 && to.trim().length > 0;
  const inputClass =
    'h-11 flex-1 rounded-xl border border-border bg-background px-3 font-sans text-base text-foreground';

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="overline">My spellings · Roman Urdu</Text>
        <Text variant="caption">Lafz will always write these words your way.</Text>
      </View>
      <Card className="gap-3 p-4">
        {rules.map((rule, i) => (
          <View key={`${rule.from}-${i}`} className="flex-row items-center gap-3">
            <Text className="flex-1 text-muted line-through">{rule.from}</Text>
            <Text className="flex-1 font-semibold">{rule.to}</Text>
            <Pressable
              accessibilityLabel={`Remove ${rule.from}`}
              onPress={() => removeRule(i)}
              className="h-8 w-8 items-center justify-center rounded-full active:bg-elevated"
            >
              <X size={16} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        <View className="flex-row items-center gap-2">
          <TextInput
            value={from}
            onChangeText={setFrom}
            placeholder="he"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            className={inputClass}
          />
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="hai"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            className={inputClass}
          />
          <Button
            size="icon"
            icon={Plus}
            accessibilityLabel="Add spelling"
            disabled={!canAdd}
            onPress={() => {
              addRule({ script: 'roman', from: from.trim(), to: to.trim() });
              setFrom('');
              setTo('');
            }}
          />
        </View>
      </Card>
    </View>
  );
}
