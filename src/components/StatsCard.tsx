import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'pending' | 'in-progress' | 'completed' | 'total';
  onClick?: () => void;
  isActive?: boolean;
}

const variantStyles = {
  pending: 'border-status-pending/30 hover:border-status-pending/50',
  'in-progress': 'border-status-in-progress/30 hover:border-status-in-progress/50',
  completed: 'border-status-completed/30 hover:border-status-completed/50',
  total: 'border-primary/30 hover:border-primary/50',
};

const iconVariantStyles = {
  pending: 'text-status-pending bg-status-pending/10',
  'in-progress': 'text-status-in-progress bg-status-in-progress/10',
  completed: 'text-status-completed bg-status-completed/10',
  total: 'text-primary bg-primary/10',
};

export function StatsCard({ title, value, icon: Icon, variant, onClick, isActive }: StatsCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        variantStyles[variant],
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{value}</p>
          </div>
          <div className={cn(
            "p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0",
            iconVariantStyles[variant]
          )}>
            <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
