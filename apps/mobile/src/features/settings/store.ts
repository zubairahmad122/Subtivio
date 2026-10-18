import type { PlanId, SpellingRule } from '@lafz/core';
import { create } from 'zustand';

export type Appearance = 'system' | 'light' | 'dark';

type SettingsState = {
  plan: PlanId;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  spellingRules: SpellingRule[];
  addRule: (rule: SpellingRule) => void;
  removeRule: (index: number) => void;
};

/**
 * Local preferences. In demo mode they live in memory; with a backend the
 * plan comes from the entitlements table and rules from `spelling_rules`.
 */
export const useSettings = create<SettingsState>((set) => ({
  plan: 'free',
  appearance: 'system',
  setAppearance: (appearance) => set({ appearance }),
  spellingRules: [
    { script: 'roman', from: 'he', to: 'hai' },
    { script: 'roman', from: 'kia', to: 'kya' },
  ],
  addRule: (rule) => set((s) => ({ spellingRules: [...s.spellingRules, rule] })),
  removeRule: (index) =>
    set((s) => ({ spellingRules: s.spellingRules.filter((_, i) => i !== index) })),
}));
