import { SCRIPT_ORDER, SCRIPTS, type Script } from '@lafz/core';

import { SegmentedControl } from '@/components/ui/segmented-control';

const LABEL_FONT: Record<Script, string | undefined> = {
  roman: undefined,
  urdu: 'font-nastaliq text-base leading-[30px]',
  hindi: 'font-deva',
};

type ScriptToggleProps = {
  value: Script;
  onChange: (script: Script) => void;
  className?: string;
};

/** The one-tap Roman / اردو / हिंदी switch: the product's signature control. */
export function ScriptToggle({ value, onChange, className }: ScriptToggleProps) {
  return (
    <SegmentedControl
      className={className}
      value={value}
      onChange={onChange}
      segments={SCRIPT_ORDER.map((id) => ({
        value: id,
        label: SCRIPTS[id].nativeLabel,
        labelClassName: LABEL_FONT[id],
      }))}
    />
  );
}
