import { useState } from 'react';
import { Task } from '@/hooks/useTasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, User, Clock, ChevronRight, CheckCircle2, Circle, Loader2, Trash2, Edit, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onDelete: (taskId: string) => void;
  onSendReminder?: (taskId: string, taskTitle: string, recipientId: string) => Promise<boolean>;
}

const statusIcons = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
};

export function TaskCard({ task, onEdit, onStatusChange, onDelete, onSendReminder }: TaskCardProps) {
  const [sendingReminder, setSendingReminder] = useState(false);
  const StatusIcon = statusIcons[task.status];
  
  const nextStatus: Record<Task['status'], Task['status']> = {
    pending: 'in_progress',
    in_progress: 'completed',
    completed: 'pending',
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange(task.id, nextStatus[task.status]);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };

  const handleSendReminder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSendReminder || !task.created_by) return;
    
    setSendingReminder(true);
    // Send to assigned user if exists, otherwise to creator
    const recipientId = task.assigned_to || task.created_by;
    await onSendReminder(task.id, task.title, recipientId);
    setSendingReminder(false);
  };

  // Safely extract entities from JSON
  const extractedEntities = task.extracted_entities as { people?: string[]; dates?: string[] } | null;
  
  const canSendReminder = task.status !== 'completed' && (task.assigned_to || task.created_by);

  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
      onClick={() => onEdit(task)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Status Toggle */}
          <button
            onClick={handleStatusClick}
            className={cn(
              "mt-0.5 sm:mt-1 flex-shrink-0 transition-colors",
              task.status === 'completed' && "text-status-completed",
              task.status === 'in_progress' && "text-status-in-progress animate-spin",
              task.status === 'pending' && "text-muted-foreground hover:text-foreground"
            )}
          >
            <StatusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1 sm:gap-2">
              <h3 className={cn(
                "font-medium text-foreground line-clamp-2 transition-all text-sm sm:text-base",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h3>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                {canSendReminder && onSendReminder && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-warning hover:text-warning"
                          onClick={handleSendReminder}
                          disabled={sendingReminder}
                        >
                          {sendingReminder ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send reminder</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleEditClick}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={handleDeleteClick}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{task.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onDelete(task.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
              <Badge variant={task.category as "scheduling" | "finance" | "technical" | "safety" | "general"} className="capitalize text-xs">
                {task.category}
              </Badge>
              <Badge variant={task.priority as "high" | "medium" | "low"} className="capitalize text-xs">
                {task.priority}
              </Badge>
              <Badge variant={task.status as "pending" | "in_progress" | "completed"} className="capitalize text-xs">
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {task.assigned_to && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="truncate max-w-[80px] sm:max-w-none">{task.assigned_to}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>{format(new Date(task.created_at), 'MMM d')}</span>
              </div>
            </div>

            {/* Extracted entities preview - hidden on mobile */}
            {extractedEntities && (
              extractedEntities.people?.length || extractedEntities.dates?.length
            ) ? (
              <div className="hidden sm:flex flex-wrap gap-1 mt-2">
                {extractedEntities.people?.slice(0, 2).map((person, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    @{person}
                  </span>
                ))}
                {extractedEntities.dates?.slice(0, 2).map((date, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    📅 {date}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
