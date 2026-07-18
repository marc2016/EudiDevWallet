import { useEffect, useRef } from 'react';
import { Timeline } from 'primereact/timeline';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { useActivityLog } from '../log/ActivityLogContext';
import { formatLogDetails, formatLogTime } from '../log/activityLog';
import type { ActivityLogEntry, LogLevel } from '../types/openid4vp';

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
  const copyDetails = async () => {
    await navigator.clipboard.writeText(formatLogDetails(entry.details));
  };

  return (
    <div className="text-sm log-timeline-item">
      <div className="font-medium word-break-all">{entry.message}</div>
      {entry.details !== undefined && (
        <Accordion className="mt-1">
          <AccordionTab header="Details">
            <div className="flex justify-content-end mb-1">
              <Button
                icon="pi pi-copy"
                severity="secondary"
                size="small"
                text
                onClick={copyDetails}
                tooltip="Details kopieren"
                aria-label="Details kopieren"
              />
            </div>
            <pre className="text-xs m-0 log-details-pre">
              {formatLogDetails(entry.details)}
            </pre>
          </AccordionTab>
        </Accordion>
      )}
    </div>
  );
}

export function ActivityLogPanel() {
  const { entries, clear } = useActivityLog();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eudidevwallet-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLog = async () => {
    await navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
  };

  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <h2 className="log-panel-title">Aktivitäts-Protokoll</h2>
        <div className="flex flex-wrap gap-2">
          <Button icon="pi pi-trash" severity="secondary" size="small" onClick={clear} tooltip="Log leeren" />
          <Button icon="pi pi-download" severity="secondary" size="small" onClick={exportJson} tooltip="Export JSON" />
          <Button icon="pi pi-copy" severity="secondary" size="small" onClick={copyLog} tooltip="Kopieren" />
        </div>
      </div>

      <div className="log-panel-content">
        {entries.length === 0 ? (
          <p className="text-color-secondary text-sm m-0">Noch keine Einträge.</p>
        ) : (
          <Timeline
            value={entries}
            align="left"
            className="log-timeline"
            opposite={(item: ActivityLogEntry) => (
              <div className="text-xs text-color-secondary log-timeline-meta">
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
      </div>
    </div>
  );
}
