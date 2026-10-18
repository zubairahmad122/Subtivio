import type { CaptionTemplate, Style } from '@subtivio/core';
import { Minus, Plus, RotateCcw } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/cn';

const POSITIONS = [
  { value: 'top', label: 'Top', y: 0.22 },
  { value: 'middle', label: 'Middle', y: 0.5 },
  { value: 'low', label: 'Low', y: 0.68 },
  { value: 'bottom', label: 'Bottom', y: 0.8 },
] as const;

const HIGHLIGHTS = ['#F4B740', '#FACC15', '#22C55E', '#38BDF8', '#EC4899', '#FFFFFF'];
const TEXT_COLORS = ['#FFFFFF', '#FBF6E9', '#FDE047', '#111111'];
const WORDS = ['1', '2', '3', '4', '5', '6'] as const;

type StylePanelProps = {
  /** The template as currently drawn (template + style). */
  template: CaptionTemplate;
  style: Style;
  onChange: (style: Style) => void;
  showUppercase: boolean;
};

/** Position, size, colours and words-per-line on top of the chosen template. */
export function StylePanel({ template, style, onChange, showUppercase }: StylePanelProps) {
  const set = (patch: Partial<Style>) => onChange({ ...style, ...patch });
  const nearest = POSITIONS.reduce((a, b) =>
    Math.abs(b.y - template.y) < Math.abs(a.y - template.y) ? b : a,
  );
  const scale = style.sizeScale ?? 1;
  const maxWords = String(style.maxWords ?? template.grouping?.maxWords ?? 4);

  return (
    <View className="gap-5">
      <Row label="Position">
        <SegmentedControl
          value={nearest.value}
          onChange={(v) => set({ y: POSITIONS.find((p) => p.value === v)!.y })}
          segments={POSITIONS.map(({ value, label }) => ({ value, label }))}
        />
      </Row>

      <Row label="Size">
        <View className="flex-row items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            icon={Minus}
            accessibilityLabel="Smaller captions"
            disabled={scale <= 0.6}
            onPress={() => set({ sizeScale: +Math.max(0.6, scale - 0.1).toFixed(1) })}
          />
          <Text variant="label" className="w-14 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </Text>
          <Button
            variant="secondary"
            size="icon"
            icon={Plus}
            accessibilityLabel="Bigger captions"
            disabled={scale >= 1.6}
            onPress={() => set({ sizeScale: +Math.min(1.6, scale + 0.1).toFixed(1) })}
          />
        </View>
      </Row>

      <Row label="Words per line">
        <SegmentedControl
          value={maxWords}
          onChange={(v) => set({ maxWords: Number(v) })}
          segments={WORDS.map((w) => ({ value: w, label: w }))}
        />
      </Row>

      <Row label="Highlight colour">
        <Swatches
          colors={HIGHLIGHTS}
          value={template.highlightColor}
          onChange={(c) => set({ highlightColor: c })}
        />
      </Row>

      <Row label="Text colour">
        <Swatches
          colors={TEXT_COLORS}
          value={template.textColor}
          onChange={(c) => set({ textColor: c })}
        />
      </Row>

      {showUppercase ? (
        <Row label="Letters">
          <SegmentedControl
            value={template.uppercase ? 'upper' : 'normal'}
            onChange={(v) => set({ uppercase: v === 'upper' })}
            segments={[
              { value: 'normal', label: 'Normal' },
              { value: 'upper', label: 'CAPITALS' },
            ]}
          />
        </Row>
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        icon={RotateCcw}
        label="Reset to template"
        disabled={Object.keys(style).length === 0}
        onPress={() => onChange({})}
        className="self-start"
      />
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="caption">{label}</Text>
      {children}
    </View>
  );
}

function Swatches({
  colors,
  value,
  onChange,
}: {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {colors.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={color}
            onPress={() => {
              tap();
              onChange(color);
            }}
            className={cn(
              'h-10 w-10 items-center justify-center rounded-full border-2',
              selected ? 'border-primary' : 'border-transparent',
            )}
          >
            <View
              className="h-7 w-7 rounded-full border border-border"
              style={{ backgroundColor: color }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
