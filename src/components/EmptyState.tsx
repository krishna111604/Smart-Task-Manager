import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters: boolean;
  onCreateTask: () => void;
  onClearFilters: () => void;
}

export function EmptyState({ hasFilters, onCreateTask, onClearFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
        <div className="p-4 rounded-full bg-muted mb-4">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No tasks match your filters</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          Try adjusting your search or filter criteria to find what you're looking for.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear all filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="p-4 rounded-full bg-primary/10 mb-4">
        <ClipboardList className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Get started by creating your first task. The system will automatically classify and organize it for you.
      </p>
      <Button onClick={onCreateTask} className="gradient-primary">
        <Plus className="h-4 w-4 mr-2" />
        Create your first task
      </Button>
    </div>
  );
}
