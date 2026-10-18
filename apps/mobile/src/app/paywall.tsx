import { PLAN_ORDER, PLANS, type Plan, type PlanId } from '@lafz/core';
import { router } from 'expo-router';
import { BellRing, Check, RotateCcw, X, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/features/settings/store';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

type Billing = 'monthly' | 'yearly';

const PAID_PLANS = PLAN_ORDER.filter((id) => id !== 'free').map((id) => PLANS[id]);
const MAX_YEARLY_SAVING = Math.max(
  ...PAID_PLANS.map((p) => Math.round((1 - p.yearlyMonthlyUsd / p.monthlyUsd) * 100)),
);

/**
 * Billing trust is a feature: Submagic's worst reviews are about surprise
 * renewals and refunds, so the promises sit right next to the prices.
 */
const PROMISES = [
  { icon: BellRing, text: 'Email reminder 3 days before every renewal' },
  { icon: XCircle, text: 'Cancel in one tap, no questions' },
  { icon: RotateCcw, text: '7-day refund, no forms' },
] as const;

export default function PaywallScreen() {
  const { colors } = useTheme();
  const currentPlan = useSettings((s) => s.plan);
  const [billing, setBilling] = useState<Billing>('yearly');
  const [selected, setSelected] = useState<PlanId>('creator');
  const [notice, setNotice] = useState<string>();

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text variant="title">Go further with Lafz</Text>
          <Text variant="caption">No watermark, every style, more videos.</Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          icon={X}
          accessibilityLabel="Close"
          onPress={() => router.back()}
        />
      </View>

      <SegmentedControl
        value={billing}
        onChange={setBilling}
        segments={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: `Yearly · save up to ${MAX_YEARLY_SAVING}%` },
        ]}
      />

      <View className="gap-3">
        {PAID_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billing={billing}
            selected={selected === plan.id}
            current={currentPlan === plan.id}
            onPress={() => setSelected(plan.id)}
          />
        ))}
      </View>

      <View className="gap-3 rounded-3xl bg-elevated p-4">
        {PROMISES.map(({ icon: Icon, text }) => (
          <View key={text} className="flex-row items-center gap-3">
            <Icon size={18} color={colors.accent} />
            <Text variant="label" className="flex-1">
              {text}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-2">
        <Button
          size="lg"
          label={`Continue with ${PLANS[selected].name}`}
          onPress={() =>
            setNotice(
              'Checkout is wired up in Phase 2: Lemon Squeezy on web, app stores on mobile.',
            )
          }
        />
        {notice ? (
          <Text variant="caption" className="text-center">
            {notice}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

type PlanCardProps = {
  plan: Plan;
  billing: Billing;
  selected: boolean;
  current: boolean;
  onPress: () => void;
};

function PlanCard({ plan, billing, selected, current, onPress }: PlanCardProps) {
  const { colors } = useTheme();
  const price = billing === 'yearly' ? plan.yearlyMonthlyUsd : plan.monthlyUsd;
  const perks = [
    `${plan.videosPerMonth} videos / month, up to ${plan.maxVideoSeconds / 60} min`,
    'No watermark · all styles',
    plan.srtExport && 'SRT export + brand kit',
    plan.seats > 1 && `${plan.seats} team seats`,
  ].filter(Boolean) as string[];

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'gap-3 rounded-3xl border-2 bg-surface p-5',
        selected ? 'border-primary' : 'border-border',
      )}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text variant="heading">{plan.name}</Text>
          {plan.id === 'creator' ? <Badge label="POPULAR" tone="primary" /> : null}
          {current ? <Badge label="CURRENT" /> : null}
        </View>
        <Text className="font-display text-2xl">
          ${price}
          <Text variant="caption"> /mo</Text>
        </Text>
      </View>
      <View className="gap-1.5">
        {perks.map((perk) => (
          <View key={perk} className="flex-row items-center gap-2">
            <Check size={14} color={colors.primary} strokeWidth={3} />
            <Text variant="caption" className="text-foreground">
              {perk}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
