import { SCRIPTS, wordText, type CaptionLine, type Script } from '@subtivio/core';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

const SCRIPT_TEXT: Record<Script, string> = {
  roman: 'font-medium text-base',
  urdu: 'font-nastaliq text-lg leading-[40px]',
  hindi: 'font-deva text-base leading-7',
};

type LineListProps = {
  lines: readonly CaptionLine[];
  script: Script;
  activeLineId?: string;
  onSeek: (time: number) => void;
  onSave: (line: CaptionLine, text: string) => void;
};

/**
 * The caption editor: every line, the one being spoken highlighted. Tap to
 * jump there, tap again to fix the text. Typing direction follows the script,
 * so Urdu edits are right-to-left.
 */
export function LineList({ lines, script, activeLineId, onSeek, onSave }: LineListProps) {
  const [editingId, setEditingId] = useState<string>();

  return (
    <View className="gap-2">
      {lines.map((line) => {
        const text = line.words.map((w) => wordText(w, script)).join(' ');
        return editingId === line.id ? (
          <LineEditor
            key={line.id}
            initial={text}
            script={script}
            onDone={(next) => {
              if (next.trim() && next !== text) onSave(line, next);
              setEditingId(undefined);
            }}
          />
        ) : (
          <Pressable
            key={line.id}
            onPress={() => (activeLineId === line.id ? setEditingId(line.id) : onSeek(line.start))}
            className={cn(
              'flex-row items-center gap-3 rounded-2xl border px-4 py-3',
              activeLineId === line.id
                ? 'border-primary/50 bg-primary/10'
                : 'border-transparent bg-surface',
            )}
          >
            <Text variant="caption" className="w-10 tabular-nums">
              {line.start.toFixed(1)}s
            </Text>
            <Text
              className={cn('flex-1', SCRIPT_TEXT[script])}
              style={{
                writingDirection: SCRIPTS[script].direction,
                textAlign: SCRIPTS[script].direction === 'rtl' ? 'right' : 'left',
              }}
            >
              {text}
            </Text>
          </Pressable>
        );
      })}
      <Text variant="caption" className="px-1">
        Tap a line to jump to it, tap again to edit.
      </Text>
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
        className={cn('min-h-11 flex-1 text-foreground', SCRIPT_TEXT[script])}
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
