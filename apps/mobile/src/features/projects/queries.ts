import type { Project } from '@subtivio/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiUrl, checkServer, type ServerHealth } from '@/lib/api';

import { demoRepository } from './demo-repository';
import { httpRepository } from './http-repository';
import type {
  CreateProjectInput,
  ExportOptions,
  ProjectPatch,
  ProjectRepository,
} from './repository';

type Backend = { kind: 'server'; health: ServerHealth } | { kind: 'demo'; apiUrl: string };

/**
 * The local server if it answers, else demo data. A found server is kept;
 * "no server" is re-checked after a few seconds, so starting the server
 * while the app is open just works.
 */
let backendPromise: Promise<Backend> | undefined;
let checkedAt = 0;
function detectBackend(): Promise<Backend> {
  if (!backendPromise || Date.now() - checkedAt > 5000) {
    const previous = backendPromise;
    checkedAt = Date.now();
    backendPromise = (async () => {
      const prior = await previous;
      if (prior?.kind === 'server') return prior;
      const health = await checkServer();
      return health ? { kind: 'server', health } : { kind: 'demo', apiUrl };
    })();
  }
  return backendPromise;
}

async function repository(): Promise<ProjectRepository> {
  return (await detectBackend()).kind === 'server' ? httpRepository : demoRepository;
}

const keys = {
  backend: ['backend'] as const,
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
};

const BUSY: Project['status'][] = ['uploading', 'transcribing', 'rendering'];

export function useBackend() {
  return useQuery({
    queryKey: keys.backend,
    queryFn: detectBackend,
    // Keep looking for the server while in demo mode.
    refetchInterval: (query) => (query.state.data?.kind === 'demo' ? 5000 : false),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: keys.all,
    queryFn: async () => (await repository()).list(),
    refetchInterval: (query) =>
      query.state.data?.some((p) => BUSY.includes(p.status)) ? 2000 : false,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => (await repository()).get(id),
    // Poll while the server is working on this video.
    refetchInterval: (query) =>
      query.state.data && BUSY.includes(query.state.data.status) ? 1000 : false,
  });
}

export function useCreateProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => (await repository()).create(input),
    onSuccess: (project) => {
      client.setQueryData(keys.detail(project.id), project);
      void client.invalidateQueries({ queryKey: keys.all });
    },
  });
}

/** Saves editor changes optimistically so toggles and edits feel instant. */
export function useUpdateProject(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProjectPatch) => (await repository()).update(id, patch),
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: keys.detail(id) });
      const previous = client.getQueryData<Project>(keys.detail(id));
      if (previous) client.setQueryData(keys.detail(id), { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) client.setQueryData(keys.detail(id), context.previous);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useExportProject(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (options: ExportOptions) => (await repository()).exportVideo(id, options),
    onSuccess: (project) => client.setQueryData(keys.detail(id), project),
  });
}

export function useDeleteProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await repository()).remove(id),
    onSuccess: (_void, id) => {
      client.removeQueries({ queryKey: keys.detail(id) });
      void client.invalidateQueries({ queryKey: keys.all });
    },
  });
}
