import type { LucideIcon } from 'lucide-react';

interface PaletteItemProps {
  icon: LucideIcon;
  color: string;
  label: string;
  description: string;
  hint: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function PaletteItem({
  icon: Icon,
  color,
  label,
  description,
  hint,
  active,
  disabled,
  onClick,
}: PaletteItemProps) {
  return (
    <button
      type="button"
      className={[
        'flex h-12 w-full items-center gap-3 px-3 text-left',
        active ? 'bg-active' : 'hover:bg-surface',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ].join(' ')}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-primary">{label}</span>
        <span className="block truncate text-xs text-secondary">{description}</span>
      </span>
      <span className="shrink-0 text-xs text-secondary">{hint}</span>
    </button>
  );
}

