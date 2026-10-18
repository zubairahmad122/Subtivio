import { SAMPLE_TRANSCRIPT, transcriptDuration, type Project } from '@lafz/core';

import type { ProjectRepository } from './repository';

/** Simulated worker time from upload to captions being ready. */
const PROCESSING_MS = 2800;

const store = new Map<string, Project>();

const demo: Project = {
  id: 'demo',
  title: 'Aaj main aap ko batata hoon',
  createdAt: new Date().toISOString(),
  status: 'ready',
  language: 'ur',
  script: 'roman',
  templateId: 'lafz',
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
 * In-memory backend for demo mode. New projects get the sample transcript
 * after a short delay, standing in for ASR + transliteration on the worker.
 */
export const demoRepository: ProjectRepository = {
  async list() {
    return [...store.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id) {
    const project = find(id);
    const ageMs = Date.now() - Date.parse(project.createdAt);
    if (project.status === 'transcribing' && ageMs > PROCESSING_MS) {
      const ready: Project = { ...project, status: 'ready', transcript: SAMPLE_TRANSCRIPT };
      store.set(id, ready);
      return ready;
    }
    return project;
  },

  async create(input) {
    const project: Project = {
      ...input,
      id: Math.random().toString(36).slice(2, 10),
      createdAt: new Date().toISOString(),
      status: 'transcribing',
      templateId: 'lafz',
    };
    store.set(project.id, project);
    return project;
  },

  async update(id, patch) {
    const updated = { ...find(id), ...patch };
    store.set(id, updated);
    return updated;
  },
};
