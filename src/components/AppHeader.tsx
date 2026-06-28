import { useEffect, useRef } from 'react';
import { Tag } from 'primereact/tag';

export function AppHeader() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setHeight = () => {
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${el.offsetHeight}px`,
      );
    };

    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="app-header flex align-items-center justify-content-between px-3 py-2 surface-section border-bottom-1 surface-border"
    >
      <div className="flex align-items-center gap-2">
        <img src="/logo.png" alt="PocketEudiWallet" height={36} />
        <span className="text-xl font-semibold">PocketEudiWallet</span>
      </div>
      <div className="flex align-items-center gap-2">
        <Tag value="Dev-Mock" severity="info" />
        <Tag value="localhost" severity="secondary" />
      </div>
    </div>
  );
}
