"use client";

import { useCallback, useEffect, useState } from "react";
import { getProjects, ApiProject } from "@/lib/api";

export function useProjects() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await getProjects();
      setProjects(rows);
    } catch {
      /* keep prior */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // optimistic local replace of a single project
  const patchLocal = useCallback((p: ApiProject) => {
    setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  }, []);

  const addLocal = useCallback((p: ApiProject) => {
    setProjects((prev) => [p, ...prev]);
  }, []);

  return { projects, loading, refresh, patchLocal, addLocal };
}
