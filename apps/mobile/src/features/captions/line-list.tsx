import { SCRIPTS, wordText, type CaptionLine, type Script } from '@subtivio/core';
import { Check, ChevronLeft, ChevronRight, Pencil, Scissors, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

const SCRIPT_TEXT: Record<Script, string> = {
  roman: 'font-medium text-base',
  urdu: 'font-nastaliq text-lg leading-[40px]',
  hindi: 'font-deva text-base leading-7',
};

/** How far one tap on "earlier"/"later" moves a line. */
const NUDGE = 0.1;

export type LineActions = {
  onSeek: (time: number) => void;
  onSave: (line: CaptionLine, text: string) => void;
  onSplit: (line: CaptionLine, wordIndex: number) => void;
  onShift: (line: CaptionLine, delta: number) => void;
  onDelete: (line: CaptionLine) => void;
};

type LineListProps = LineActions & {
  lines: readonly CaptionLine[];
  script: Script;
  /** Line being spoken right now. */
  activeLineId?: string;
};

type Mode = { lineId: string; kind: 'tools' | 'edit' | 'split' };

/**
 * Every caption line, the one being spoken highlighted. Tap a line to jump
 * there and open its tools: edit text, split, nudge timing, delete. Typing
 * direction follows the script, so Urdu edits are right-to-left.
 */
export function LineList({ lines, script, activeLineId, ...actions }: LineListProps) {
  const [mode, setMode] = useState<Mode>();
  const rtl = SCRIPTS[script].direction === 'rtl';

  return (
    <View className="gap-2">
      {lines.map((line) => {
        const text = line.words.map((w) => wordText(w, script)).join(' ');
        const selected = mode?.lineId === line.id;

        if (selected && mode.kind === 'edit') {
          return (
            <LineEditor
              key={line.id}
              initial={text}
              script={script}
              onDone={(next) => {
                if (next.trim() && next !== text) actions.onSave(line, next);
                setMode({ lineId: line.id, kind: 'tools' });
              }}
            />
          );
        }

        return (
          <View
            key={line.id}
            className={cn(
              'overflow-hidden rounded-2xl border',
              selected
                ? 'border-primary bg-surface'
                : activeLineId === line.id
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-transparent bg-surface',
            )}
          >
            <Pressable
              onPress={() => {
                actions.onSeek(line.start);
                setMode(selected ? undefined : { lineId: line.id, kind: 'tools' });
              }}
              className="flex-row items-center gap-3 px-4 py-3"
            >
              <Text variant="caption" className="w-10 tabular-nums">
                {line.start.toFixed(1)}s
              </Text>
              <Text
                className={cn('flex-1', SCRIPT_TEXT[script])}
                style={{ writingDirection: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' }}
              >
                {text}
              </Text>
            </Pressable>

            {selected && mode.kind === 'split' ? (
              <SplitPicker
                line={line}
                script={script}
                onPick={(i) => {
                  actions.onSplit(line, i);
                  setMode(undefined);
                }}
                onCancel={() => setMode({ lineId: line.id, kind: 'tools' })}
              />
            ) : selected ? (
              <View className="flex-row flex-wrap gap-2 border-t border-border px-3 py-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Pencil}
                  label="Edit"
                  onPress={() => setMode({ lineId: line.id, kind: 'edit' })}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Scissors}
                  label="Split"
                  disabled={line.words.length < 2}
                  onPress={() => setMode({ lineId: line.id, kind: 'split' })}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ChevronLeft}
                  label={`${NUDGE}s`}
                  accessibilityLabel="Show earlier"
                  onPress={() => actions.onShift(line, -NUDGE)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ChevronRight}
                  label={`${NUDGE}s`}
                  accessibilityLabel="Show later"
                  onPress={() => actions.onShift(line, NUDGE)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  accessibilityLabel="Delete line"
                  onPress={() => {
                    actions.onDelete(line);
                    setMode(undefined);
                  }}
                />
              </View>
            ) : null}
          </View>
        );
      })}
      <Text variant="caption" className="px-1">
        Tap a line to jump to it and edit, split, move or delete it.
      </Text>
    </View>
  );
}

/** Tap the word that should start the new line. */
function SplitPicker({
  line,
  script,
  onPick,
  onCancel,
}: {
  line: CaptionLine;
  script: Script;
  onPick: (wordIndex: number) => void;
  onCancel: () => void;
}) {
  const rtl = SCRIPTS[script].direction === 'rtl';
  return (
    <View className="gap-2 border-t border-border px-3 py-2">
      <View className="flex-row items-center justify-between">
        <Text variant="caption">New line starts at…</Text>
        <Button
          variant="ghost"
          size="sm"
          icon={X}
          accessibilityLabel="Cancel split"
          onPress={onCancel}
        />
      </View>
      <View className={cn('flex-wrap gap-2', rtl ? 'flex-row-reverse' : 'flex-row')}>
        {line.words.slice(1).map((word, i) => (
          <Pressable
            key={word.id}
            onPress={() => {
              tap();
              onPick(i + 1);
            }}
            className="rounded-xl bg-elevated px-3 py-1.5 active:bg-primary/20"
          >
            <Text className={SCRIPT_TEXT[script]}>{wordText(word, script)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LineEditor({
  initial,
  script,
  onDone,
}: {
  initial: string;
  script: Script;
  onDone: (text: string) => void;
}) {
  const { colors } = useTheme();
  const [value, setValue] = useState(initial);
  const rtl = SCRIPTS[script].direction === 'rtl';

  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-primary bg-surface p-2 pl-4">
      <TextInput
        autoFocus
        value={value}
        onChangeText={setValue}
        onSubmitEditing={() => onDone(value)}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={colors.primary}
        className={cn('min-h-11 w-0 min-w-0 flex-1 text-foreground', SCRIPT_TEXT[script])}
        style={{ writingDirection: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' }}
      />
      <Button
        size="icon"
        icon={Check}
        accessibilityLabel="Save line"
        onPress={() => onDone(value)}
      />
    </View>
  );
}
