import type { Project, Script, SpellingRule, SpokenLanguage } from '@subtivio/core';

export type CreateProjectInput = {
  title: string;
  videoUri: string;
  durationSec: number;
  language: SpokenLanguage;
  script: Script;
};

export type ProjectPatch = Partial<
  Pick<Project, 'title' | 'script' | 'templateId' | 'style' | 'transcript'>
>;

export type ExportOptions = { watermark: boolean; spellingRules: SpellingRule[] };

/**
 * Everything the UI needs from the backend. Screens only talk to this
 * interface through the hooks in queries.ts: the local server
 * (http-repository) when one is running, else in-memory demo data.
 */
export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, patch: ProjectPatch): Promise<Project>;
  remove(id: string): Promise<void>;
  /** Starts an MP4 render; poll the project until its status is `exported`. */
  exportVideo(id: string, options: ExportOptions): Promise<Project>;
}
