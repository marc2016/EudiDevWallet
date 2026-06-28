import { useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Timeline } from 'primereact/timeline';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { useActivityLog } from '../log/ActivityLogContext';
import { formatLogDetails, formatLogTime } from '../log/activityLog';
import type { ActivityLogEntry, LogCategory, LogLevel } from '../types/openid4vp';

const FILTER_OPTIONS: Array<{ label: string; value: LogCategory | 'all' }> = [
  { label: 'Alle', value: 'all' },
  { label: 'Parse', value: 'parse' },
  { label: 'HTTP', value: 'http' },
  { label: 'Zertifikat', value: 'cert' },
  { label: 'Build', value: 'build' },
];

function levelIcon(level: LogLevel): string {
  switch (level) {
    case 'success':
      return 'pi pi-check-circle';
    case 'warn':
      return 'pi pi-exclamation-triangle';
    case 'error':
      return 'pi pi-times-circle';
    default:
      return 'pi pi-info-circle';
  }
}

function levelColor(level: LogLevel): string {
  switch (level) {
    case 'success':
      return 'var(--green-500)';
    case 'warn':
      return 'var(--yellow-600)';
    case 'error':
      return 'var(--red-500)';
    default:
      return 'var(--blue-500)';
  }
}

function TimelineItem({ entry }: { entry: ActivityLogEntry }) {
  return (
    <div className="text-sm">
      <div className="font-medium">{entry.message}</div>
      {entry.details !== undefined && (
        <Accordion className="mt-1">
          <AccordionTab header="Details">
            <pre className="text-xs overflow-auto m-0" style={{ maxHeight: '12rem' }}>
              {formatLogDetails(entry.details)}
            </pre>
          </AccordionTab>
        </Accordion>
      )}
    </div>
  );
}

export function ActivityLogPanel() {
  const { filteredEntries, clear, filter, setFilter, entries } = useActivityLog();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredEntries.length]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pocketeudiwallet-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLog = async () => {
    await navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
  };

  return (
    <Card title="Aktivitäts-Protokoll" className="log-panel">
      <div className="flex flex-wrap gap-2 mb-2">
        <SelectButton
          value={filter}
          options={FILTER_OPTIONS}
          onChange={(e) => e.value && setFilter(e.value)}
        />
        <Button icon="pi pi-trash" severity="secondary" size="small" onClick={clear} tooltip="Log leeren" />
        <Button icon="pi pi-download" severity="secondary" size="small" onClick={exportJson} tooltip="Export JSON" />
        <Button icon="pi pi-copy" severity="secondary" size="small" onClick={copyLog} tooltip="Kopieren" />
      </div>

      {filteredEntries.length === 0 ? (
        <p className="text-color-secondary text-sm">Noch keine Einträge.</p>
      ) : (
        <Timeline
          value={filteredEntries}
          align="left"
          className="log-timeline"
          opposite={(item: ActivityLogEntry) => (
            <div className="text-xs text-color-secondary">
              <div>{formatLogTime(item.timestamp)}</div>
              <Tag value={item.category} severity="secondary" className="mt-1" />
            </div>
          )}
          marker={(item: ActivityLogEntry) => (
            <i
              className={levelIcon(item.level)}
              style={{ color: levelColor(item.level), fontSize: '1.1rem' }}
            />
          )}
          content={(item: ActivityLogEntry) => <TimelineItem entry={item} />}
        />
      )}
      <div ref={bottomRef} />
    </Card>
  );
}
