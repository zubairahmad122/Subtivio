import type { Project } from '@subtivio/core';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

import type { ProjectRepository } from './repository';

const json = (body: unknown): RequestInit => ({
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/** Talks to services/server: uploads, polling, edits, exports. */
export const httpRepository: ProjectRepository = {
  list: () => api<Project[]>('/projects'),

  get: (id) => api<Project>(`/projects/${id}`),

  async create(input) {
    const form = new FormData();
    if (Platform.OS === 'web') {
      // On web the picker returns a blob: URL; upload the actual bytes.
      form.append('video', await (await fetch(input.videoUri)).blob(), `${input.title}.mp4`);
    } else {
      // React Native's FormData streams a local file from its URI.
      form.append('video', {
        uri: input.videoUri,
        name: `${input.title}.mp4`,
        type: 'video/mp4',
      } as unknown as Blob);
    }
    form.append('title', input.title);
    form.append('language', input.language);
    form.append('script', input.script);
    return api<Project>('/projects', { method: 'POST', body: form });
  },

  update: (id, patch) => api<Project>(`/projects/${id}`, { method: 'PATCH', ...json(patch) }),

  remove: (id) => api<void>(`/projects/${id}`, { method: 'DELETE' }),

  exportVideo: (id, options) =>
    api<Project>(`/projects/${id}/export`, { method: 'POST', ...json(options) }),
};
