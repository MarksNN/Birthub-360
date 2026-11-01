import type React from 'react';
import { useState } from 'react';

export interface DropdownMenuProps {
  triggerLabel: string;
  items: Array<{ label: string; onClick: () => void }>;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ triggerLabel, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = `dropdown-${Math.random().toString(36).substring(2, 6)}`;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-slate-800 text-white rounded focus-visible:ring-2"
      >
        {triggerLabel}
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border rounded shadow-lg z-50"
        >
          {items.map((item, idx) => (
            <div key={idx} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
