'use client';

import { useEffect, useRef, useState } from 'react';
import { selectStyle } from '@/lib/selectStyle';

interface Props {
  options: readonly string[];
  value: string;
  onChange: (val: string) => void;
  width?: string;
  /** Smaller height + font for mobile filter rows. */
  compact?: boolean;
  /** Render an option's label (e.g. to append a "(current)" marker). Defaults to the raw value. */
  renderOption?: (opt: string) => React.ReactNode;
  title?: string;
}

/**
 * Single-select dropdown matching MultiSelect's chrome. Unlike a native <select>
 * (whose popup the browser caps + scrolls) and unlike MultiSelect (capped at
 * max-h-60), the menu here grows to fit ALL options with no internal scroll, so
 * every choice is visible at once.
 */
export function SingleSelect({
  options, value, onChange, width = '10rem', compact, renderOption, title,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const heightClass = compact ? 'h-10 text-sm' : 'h-9 text-[0.8125rem]';
  const label = renderOption ?? ((opt: string) => opt);

  return (
    <div ref={ref} className="relative" style={{ width }} title={title}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${heightClass} w-full px-3 pr-8 rounded-md border bg-white text-left cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] truncate`}
        style={selectStyle}
      >
        {label(value)}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-50 w-full"
          style={{ borderColor: 'var(--border)' }}
        >
          {options.map((opt) => {
            const active = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${active ? 'font-semibold' : ''}`}
                style={{ color: 'var(--primary)', background: active ? 'var(--muted)' : undefined }}
              >
                {label(opt)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
