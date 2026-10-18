import { SAMPLE_TRANSCRIPT, transcriptDuration, type Project } from '@subtivio/core';

import { apiUrl } from '@/lib/api';

import type { ProjectRepository } from './repository';

const store = new Map<string, Project>();

const demo: Project = {
  id: 'demo',
  title: 'Aaj main aap ko batata hoon',
  createdAt: new Date().toISOString(),
  status: 'ready',
  language: 'ur',
  script: 'roman',
  templateId: 'signature',
  durationSec: transcriptDuration(SAMPLE_TRANSCRIPT),
  transcript: SAMPLE_TRANSCRIPT,
};
store.set(demo.id, demo);

function find(id: string): Project {
  const project = store.get(id);
  if (!project) throw new Error(`Project ${id} not found`);
  return project;
}

/**
 * In-memory backend used when no server answers: only the bundled sample
 * project, so the editor can be tried without a server.
 */
export const demoRepository: ProjectRepository = {
  async list() {
    return [...store.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id) {
    return find(id);
  },

  /**
   * Never fake captions for a real video: without the server there is no
   * transcription, so say exactly where the app looked.
   */
  async create() {
    throw new Error(
      `No Subtivio server at ${apiUrl}. On the laptop run "pnpm run server", keep the phone on the same Wi-Fi, and allow port 8787 in the firewall. Test by opening ${apiUrl}/health in the phone's browser.`,
    );
  },

  async update(id, patch) {
    const updated = { ...find(id), ...patch };
    store.set(id, updated);
    return updated;
  },

  async remove(id) {
    store.delete(id);
  },

  async exportVideo() {
    throw new Error('Start the Subtivio server (pnpm run server) to export videos.');
  },
};
