import { useCallback, useEffect, useRef, useState } from 'react';
import { reconcileProject, type Project } from './model';

export function flushEditing() {
  const focused = document.activeElement;
  if (focused instanceof HTMLElement && focused.matches('input,textarea,[contenteditable="true"]')) focused.blur();
}

export function useWorkspace(onMessage: (text: string, tone?: 'info' | 'warn' | 'danger') => void) {
  const [project, setProject] = useState<Project | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const projectRef = useRef(project), pathRef = useRef(path), revisionRef = useRef(0), savedRef = useRef(0);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const saveError = useRef(false);
  const messageRef = useRef(onMessage); messageRef.current = onMessage;

  const load = useCallback((next: Project, nextPath: string | null, unsaved = false) => {
    const value = reconcileProject(next);
    projectRef.current = value; pathRef.current = nextPath;
    revisionRef.current = unsaved ? 1 : 0; savedRef.current = 0;
    setProject(value); setPath(nextPath); setRevision(revisionRef.current); setSavedRevision(0);
    setLastSaved(nextPath ? value.updatedAt : null); setDirtyIds(new Set()); saveError.current = false;
  }, []);
  const change = useCallback((update: (previous: Project) => Project, archiveId?: string | string[]) => {
    if (!projectRef.current) return;
    const next = update(projectRef.current);
    if (next === projectRef.current) return;
    const value = reconcileProject({ ...next, updatedAt: Date.now() });
    projectRef.current = value; revisionRef.current += 1;
    setProject(value); setRevision(revisionRef.current); saveError.current = false;
    if (archiveId) setDirtyIds(ids => new Set([...ids, ...(Array.isArray(archiveId) ? archiveId : [archiveId])]));
  }, []);
  const save = useCallback(async (asNew = false, quiet = false): Promise<boolean> => {
    flushEditing();
    while (inFlight.current) {
      const success = await inFlight.current;
      if (!success) return false;
      // A later edit must not be mistaken for a completed save.
      if (!asNew && revisionRef.current === savedRef.current) return true;
    }
    const snapshot = projectRef.current;
    if (!snapshot || !window.desktop) return false;
    const targetRevision = revisionRef.current;
    setSaving(true);
    const operation = (async () => {
      try {
        const result = asNew || !pathRef.current
          ? await window.desktop.saveAs(snapshot)
          : await window.desktop.saveProject(snapshot);
        if (!result.ok) {
          if (!result.canceled) { saveError.current = true; messageRef.current(result.error || '保存未完成。请检查工程文件夹是否可写，再重新保存。', 'danger'); }
          return false;
        }
        if (projectRef.current?.id === snapshot.id) {
          if (result.path) { pathRef.current = result.path; setPath(result.path); }
          savedRef.current = targetRevision; setSavedRevision(targetRevision); setLastSaved(Date.now());
          if (revisionRef.current === targetRevision) setDirtyIds(new Set());
          if (!quiet) messageRef.current('已保存到 project.json。图片保存在 media/，移动工程时请带上整个文件夹。');
        }
        return true;
      } catch (error) {
        saveError.current = true;
        messageRef.current(`保存未完成。${error instanceof Error ? error.message : String(error)}`, 'danger');
        return false;
      }
    })();
    inFlight.current = operation;
    try { return await operation; }
    finally {
      if (inFlight.current === operation) { setSaving(false); inFlight.current = null; }
    }
  }, []);
  useEffect(() => {
    if (!project || !path || revision === savedRevision || saveError.current) return;
    const timer = setTimeout(() => { void save(false, true); }, 1800);
    return () => clearTimeout(timer);
  }, [project, path, revision, savedRevision, save]);

  return { project, path, revision, dirty: revision !== savedRevision, dirtyIds, saving, lastSaved, load, change, save, projectRef, pathRef,
    isDirty: () => revisionRef.current !== savedRef.current,
    waitForSave: () => inFlight.current ?? Promise.resolve(true) };
}
