import { mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ProjectSchema, type Project } from '@subtivio/core';

import { env } from './env';

/**
 * File-based project store: one folder per project holding project.json, the
 * source video and renders. Swap for Postgres + object storage when hosted.
 */
export const projectsDir = path.join(env.DATA_DIR, 'projects');
// Created up front: the static file server checks its root when it starts.
mkdirSync(projectsDir, { recursive: true });

export function projectDir(id: string) {
  // ids are generated server-side; this guards against path tricks anyway.
  if (!/^[a-z0-9]+$/.test(id)) throw new Error('Invalid project id');
  return path.join(projectsDir, id);
}

export async function listProjects(): Promise<Project[]> {
  await fs.mkdir(projectsDir, { recursive: true });
  const ids = await fs.readdir(projectsDir);
  const projects = await Promise.all(ids.map((id) => getProject(id).catch(() => undefined)));
  return projects
    .filter((p): p is Project => p !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProject(id: string): Promise<Project> {
  const raw = await fs.readFile(path.join(projectDir(id), 'project.json'), 'utf8');
  return ProjectSchema.parse(JSON.parse(raw));
}

export async function saveProject(project: Project): Promise<Project> {
  const dir = projectDir(project.id);
  await fs.mkdir(dir, { recursive: true });
  // Write then rename so a crash never leaves half a JSON file.
  const tmp = path.join(dir, 'project.json.tmp');
  await fs.writeFile(tmp, JSON.stringify(project, null, 2));
  await fs.rename(tmp, path.join(dir, 'project.json'));
  return project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  return saveProject({ ...(await getProject(id)), ...patch });
}

export async function deleteProject(id: string): Promise<void> {
  await fs.rm(projectDir(id), { recursive: true, force: true });
}
