'use client';

import { useEffect, useRef, useState } from 'react';
import { selectStyle } from '@/lib/selectStyle';

interface Props {
  options: readonly string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  width?: string;
  placeholder?: string;
  /** Word used in the "all" / "N selected" summary. */
  noun?: string;
  /** Smaller height + font for mobile filter rows. */
  compact?: boolean;
}

export function MultiSelect({
  options, selected, onChange, width = '14rem', placeholder = 'Select…', noun = 'hotels', compact,
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

  const allSelected = options.length > 0 && selected.length === options.length;

  function toggleAll() {
    onChange(allSelected ? [] : [...options]);
  }
  function toggle(opt: string) {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  }

  const display =
    selected.length === 0 ? placeholder
      : allSelected ? `All ${noun}`
      : selected.length === 1 ? selected[0]
      : `${selected.length} ${noun} selected`;

  const heightClass = compact ? 'h-10 text-sm' : 'h-9 text-[0.8125rem]';

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${heightClass} w-full px-3 pr-8 rounded-md border bg-white text-left cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] truncate`}
        style={selectStyle}
      >
        {display}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-50 w-full max-h-60 overflow-y-auto"
          style={{ borderColor: 'var(--border)' }}
        >
          <label
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b"
            style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-[var(--accent)]"
            />
            {allSelected ? 'Clear all' : 'Select all'}
          </label>
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50"
              style={{ color: 'var(--primary)' }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-[var(--accent)]"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
