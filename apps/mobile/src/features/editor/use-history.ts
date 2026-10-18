import type { Project } from '@subtivio/core';
import { useState } from 'react';

import type { ProjectPatch } from '@/features/projects/repository';

type Entry = { before: ProjectPatch; after: ProjectPatch };

const LIMIT = 50;

/** The current values of the fields a patch is about to change. */
function snapshot(project: Project, patch: ProjectPatch): ProjectPatch {
  const before: ProjectPatch = {};
  for (const key of Object.keys(patch) as (keyof ProjectPatch)[]) {
    // An unset style must be sent back as {} so the server clears it.
    (before as Record<string, unknown>)[key] =
      key === 'style' ? (project.style ?? {}) : project[key];
  }
  return before;
}

/**
 * Undo / redo for editor changes. Every edit goes through `apply`, which
 * remembers what it replaced; undo re-applies the old values.
 */
export function useEditorHistory(project: Project, save: (patch: ProjectPatch) => void) {
  const [past, setPast] = useState<Entry[]>([]);
  const [future, setFuture] = useState<Entry[]>([]);

  function apply(patch: ProjectPatch) {
    setPast((p) => [...p.slice(-(LIMIT - 1)), { before: snapshot(project, patch), after: patch }]);
    setFuture([]);
    save(patch);
  }

  function undo() {
    const entry = past.at(-1);
    if (!entry) return;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, entry]);
    save(entry.before);
  }

  function redo() {
    const entry = future.at(-1);
    if (!entry) return;
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, entry]);
    save(entry.after);
  }

  return { apply, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
