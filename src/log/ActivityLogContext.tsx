import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createLogEntry } from './activityLog';
import type { ActivityLogEntry, LogCategory, LogLevel } from '../types/openid4vp';

interface ActivityLogContextValue {
  entries: ActivityLogEntry[];
  log: (level: LogLevel, category: LogCategory, message: string, details?: unknown) => void;
  clear: () => void;
  filter: LogCategory | 'all';
  setFilter: (f: LogCategory | 'all') => void;
  filteredEntries: ActivityLogEntry[];
}

const ActivityLogContext = createContext<ActivityLogContextValue | null>(null);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [filter, setFilter] = useState<LogCategory | 'all'>('all');

  const log = useCallback(
    (level: LogLevel, category: LogCategory, message: string, details?: unknown) => {
      setEntries((prev) => [...prev, createLogEntry(level, category, message, details)]);
    },
    [],
  );

  const clear = useCallback(() => setEntries([]), []);

  const filteredEntries = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.category === filter)),
    [entries, filter],
  );

  const value = useMemo(
    () => ({ entries, log, clear, filter, setFilter, filteredEntries }),
    [entries, log, clear, filter, filteredEntries],
  );

  return (
    <ActivityLogContext.Provider value={value}>{children}</ActivityLogContext.Provider>
  );
}

export function useActivityLog(): ActivityLogContextValue {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) throw new Error('useActivityLog must be used within ActivityLogProvider');
  return ctx;
}
