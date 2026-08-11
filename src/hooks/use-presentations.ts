'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getPresentation,
  listPresentations,
  PRESENTATIONS_CHANGED_EVENT,
  type PresentationSummary,
  type StoredPresentation,
} from '@/lib/browser/presentations';

export function usePresentationSummaries() {
  const [presentations, setPresentations] = useState<PresentationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setPresentations(await listPresentations());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(PRESENTATIONS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PRESENTATIONS_CHANGED_EVENT, refresh);
  }, [refresh]);

  return { presentations, isLoading, refresh };
}

export function usePresentation(id: string | undefined) {
  const [presentation, setPresentation] = useState<StoredPresentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) {
      setPresentation(null);
      setIsLoading(false);
      return;
    }

    try {
      setPresentation(await getPresentation(id));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    void refresh();
    window.addEventListener(PRESENTATIONS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PRESENTATIONS_CHANGED_EVENT, refresh);
  }, [refresh]);

  return { presentation, isLoading, refresh };
}
