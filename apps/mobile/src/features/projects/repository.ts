import type { Project, Script, SpokenLanguage } from '@subtivio/core';

export type CreateProjectInput = {
  title: string;
  videoUri: string;
  durationSec: number;
  language: SpokenLanguage;
  script: Script;
};

export type ProjectPatch = Partial<Pick<Project, 'title' | 'script' | 'templateId' | 'transcript'>>;

/**
 * Everything the UI needs from the backend. Screens only talk to this
 * interface through the hooks in queries.ts, so moving from the demo store to
 * Supabase + the worker is a change to one file.
 */
export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, patch: ProjectPatch): Promise<Project>;
}
