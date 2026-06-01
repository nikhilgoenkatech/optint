// ============================================================
// DYNATRACE OPERATIONAL INTELLIGENCE - REACT HOOKS
// ============================================================
// To switch from mock to live data, change this one import:
//   Mock:  import { MockDataService as DataService } from '../services/mockDataService';
//   Live:  import { DynatraceService as DataService } from '../services/dynatraceService';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FilterState, DynatraceProblem, WeeklySnapshot,
  PatternHistoryRecord, Severity, ProblemStatus,
} from '../models';

// ── Toggle this import to switch data source ───────────────
import { MockDataService as DataService } from '../services/mockDataService';
// import { DynatraceService as DataService } from '../services/dynatraceService';

// ── Generic async state hook ───────────────────────────────
interface AsyncState<T> {
  data:    T | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps:    unknown[]
): AsyncState<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message ?? 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
    return () => abortRef.current?.abort();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── Domain hooks ───────────────────────────────────────────

export function useProblems(filters: FilterState) {
  return useAsyncData<DynatraceProblem[]>(
    () => DataService.getProblems(filters),
    [JSON.stringify(filters)]
  );
}

export function useWeeklySnapshots() {
  return useAsyncData<WeeklySnapshot[]>(
    () => DataService.getWeeklySnapshots(),
    []
  );
}

export function usePatternHistory() {
  return useAsyncData<PatternHistoryRecord[]>(
    () => DataService.getPatternHistory(),
    []
  );
}

// ── Filter state hook ──────────────────────────────────────
const DEFAULT_FILTERS: FilterState = {
  timeRange:       { from: 'now-7d', to: 'now', label: 'Last 7 days' },
  applications:    [],
  tags:            [],
  managementZones: [],
  severities:      [],
  statuses:        [],
  searchText:      '',
};

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const updateFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return { filters, updateFilters, resetFilters };
}

// ── Persona hook ───────────────────────────────────────────
export type PersonaType = 'executive' | 'developer' | 'sre';

export function usePersona() {
  const [persona, setPersona] = useState<PersonaType>(() => {
    // In production: reads from Dynatrace IAM via PersonaResolver.resolvePersona()
    // Here: use localStorage so demo state persists across page refreshes
    return (localStorage.getItem('opint-persona') as PersonaType) ?? 'executive';
  });

  const switchPersona = useCallback((p: PersonaType) => {
    setPersona(p);
    localStorage.setItem('opint-persona', p);
  }, []);

  return { persona, switchPersona };
}
