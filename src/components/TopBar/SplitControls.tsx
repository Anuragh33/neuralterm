import { Columns2, Rows2 } from 'lucide-react';

interface SplitControlsProps {
  onSplitRight: () => void;
  onSplitDown: () => void;
}

export function SplitControls({ onSplitRight, onSplitDown }: SplitControlsProps) {
  return (
    <div className="flex items-center gap-1 border-l border-border px-2">
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded text-secondary hover:bg-surface hover:text-primary"
        aria-label="Split right"
        title="Split right"
        onClick={onSplitRight}
      >
        <Columns2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded text-secondary hover:bg-surface hover:text-primary"
        aria-label="Split down"
        title="Split down"
        onClick={onSplitDown}
      >
        <Rows2 className="h-4 w-4" />
      </button>
    </div>
  );
}
