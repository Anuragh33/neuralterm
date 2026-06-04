import { Plus } from 'lucide-react';

interface AddSessionButtonProps {
  collapsed: boolean;
  onClick: () => void;
}

export function AddSessionButton({ collapsed, onClick }: AddSessionButtonProps) {
  return (
    <button
      type="button"
      className={[
        'flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface text-sm font-medium text-primary hover:border-[#4db877] hover:text-white',
        collapsed ? 'w-10' : 'w-full',
      ].join(' ')}
      onClick={onClick}
      aria-label="New session"
      title="New session"
    >
      <Plus className="h-4 w-4" />
      {!collapsed && <span>New Session</span>}
    </button>
  );
}

