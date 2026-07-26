import { useEffect, useRef, useState } from 'react';
import { Timeline } from 'primereact/timeline';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { useActivityLog } from '../log/ActivityLogContext';
import { formatLogDetails, formatLogTime } from '../log/activityLog';
import { loadClearLogOnRequest, saveClearLogOnRequest } from '../settings/walletSettings';
import type { ActivityLogEntry, LogLevel } from '../types/openid4vp';

function getEffectiveLevel(entry: ActivityLogEntry): LogLevel {
  if (entry.level === 'error' || entry.level === 'warn') {
    return entry.level;
  }

  const message = entry.message || '';
  if (/\b(4\d\d|5\d\d)\b/.test(message) || /HTTP\s+[45]\d\d/i.test(message)) {
    return 'warn';
  }

  if (entry.details && typeof entry.details === 'object' && entry.details !== null) {
    const detailsObj = entry.details as Record<string, unknown>;
    if (typeof detailsObj.status === 'number' && detailsObj.status >= 400) {
      return 'warn';
    }
  }

  return entry.level;
}

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
  const [showDetails, setShowDetails] = useState(false);

  const copyDetails = async () => {
    await navigator.clipboard.writeText(formatLogDetails(entry.details));
  };

  return (
    <div className="text-sm log-timeline-item">
      <div className="flex align-items-start justify-content-between gap-2">
        <div className="font-medium word-break-all flex-1">{entry.message}</div>
        {entry.details !== undefined && (
          <Button
            icon={showDetails ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
            severity="secondary"
            size="small"
            text
            className="p-button-xs flex-shrink-0"
            style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: 'auto' }}
            onClick={() => setShowDetails(!showDetails)}
            aria-label="Details umschalten"
          />
        )}
      </div>
      {entry.details !== undefined && showDetails && (
        <div className="mt-2 p-2 surface-100 border-round">
          <div className="flex justify-content-end mb-1">
            <Button
              icon="pi pi-copy"
              severity="secondary"
              size="small"
              text
              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
              onClick={copyDetails}
              aria-label="Details kopieren"
            />
          </div>
          <pre className="text-xs m-0 log-details-pre">
            {formatLogDetails(entry.details)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ActivityLogPanel() {
  const { entries, clear } = useActivityLog();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [clearOnRequest, setClearOnRequest] = useState<boolean>(loadClearLogOnRequest);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const handleClearOnRequestChange = (checked: boolean) => {
    setClearOnRequest(checked);
    saveClearLogOnRequest(checked);
  };

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
          <Button icon="pi pi-trash" severity="secondary" size="small" onClick={clear} />
          <Button icon="pi pi-download" severity="secondary" size="small" onClick={exportJson} />
          <Button icon="pi pi-copy" severity="secondary" size="small" onClick={copyLog} />
        </div>
      </div>

      <div className="flex align-items-center mb-3 gap-2">
        <Checkbox
          inputId="clear-on-request"
          onChange={(e) => handleClearOnRequestChange(Boolean(e.checked))}
          checked={clearOnRequest}
        />
        <label htmlFor="clear-on-request" className="text-sm font-medium select-none cursor-pointer text-color-secondary">
          Protokoll bei neuer Anfrage löschen
        </label>
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
            marker={(item: ActivityLogEntry) => {
              const effLevel = getEffectiveLevel(item);
              return (
                <i
                  className={levelIcon(effLevel)}
                  style={{ color: levelColor(effLevel), fontSize: '1.1rem' }}
                />
              );
            }}
            content={(item: ActivityLogEntry) => <TimelineItem entry={item} />}
          />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
