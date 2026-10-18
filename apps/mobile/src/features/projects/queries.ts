import type { Project } from '@lafz/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { demoRepository } from './demo-repository';
import type { CreateProjectInput, ProjectPatch, ProjectRepository } from './repository';

// Phase 2: choose a Supabase-backed repository here when `isDemoMode` is false.
const repository: ProjectRepository = demoRepository;

const keys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
};

const isProcessing = (p?: Project) => p?.status === 'transcribing' || p?.status === 'uploading';

export function useProjects() {
  return useQuery({ queryKey: keys.all, queryFn: () => repository.list() });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => repository.get(id),
    // Poll while the worker is busy. Supabase Realtime replaces this later.
    refetchInterval: (query) => (isProcessing(query.state.data) ? 1000 : false),
  });
}

export function useCreateProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => repository.create(input),
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
    mutationFn: (patch: ProjectPatch) => repository.update(id, patch),
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
