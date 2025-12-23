import { useState, useEffect } from 'react';
import { Task, TaskCategory, TaskPriority } from '@/hooks/useTasks';
import { classifyTask } from '@/lib/classification';
import { ClassificationResult } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, User, Tag, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    assigned_to?: string;
    due_date?: string;
    status?: Task['status'];
  }) => void;
  task?: Task | null;
  onDelete?: (id: string) => void;
}

export function TaskForm({ isOpen, onClose, onSubmit, task, onDelete }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [overrideCategory, setOverrideCategory] = useState<TaskCategory | null>(null);
  const [overridePriority, setOverridePriority] = useState<TaskPriority | null>(null);
  const [status, setStatus] = useState<Task['status']>('pending');

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssignedTo(task.assigned_to || '');
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setOverrideCategory(task.category);
      setOverridePriority(task.priority);
      setStatus(task.status);
      setClassification(null);
    } else {
      resetForm();
    }
  }, [task, isOpen]);

  useEffect(() => {
    if (title || description) {
      const result = classifyTask(title, description);
      setClassification(result);
    } else {
      setClassification(null);
    }
  }, [title, description]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setDueDate(undefined);
    setClassification(null);
    setOverrideCategory(null);
    setOverridePriority(null);
    setStatus('pending');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category: overrideCategory || classification?.category,
      priority: overridePriority || classification?.priority,
      assigned_to: assignedTo.trim() || undefined,
      due_date: dueDate?.toISOString(),
      status: isEditing ? status : undefined,
    });

    resetForm();
  };

  const categories: TaskCategory[] = ['scheduling', 'finance', 'technical', 'safety', 'general'];
  const priorities: TaskPriority[] = ['high', 'medium', 'low'];
  const statuses: Task['status'][] = ['pending', 'in_progress', 'completed'];

  const finalCategory = overrideCategory || classification?.category || 'general';
  const finalPriority = overridePriority || classification?.priority || 'low';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Task' : 'Create New Task'}</SheetTitle>
          <SheetDescription>
            {isEditing 
              ? 'Update the task details below.'
              : 'Fill in the details and the system will auto-classify your task.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Schedule meeting with team"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task in detail..."
              rows={4}
              required
            />
          </div>

          {/* Auto-Classification Preview */}
          {classification && (
            <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Auto-Classification</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant={finalCategory as "scheduling" | "finance" | "technical" | "safety" | "general"} className="capitalize">
                  <Tag className="h-3 w-3 mr-1" />
                  {finalCategory}
                </Badge>
                <Badge variant={finalPriority as "high" | "medium" | "low"} className="capitalize">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {finalPriority} priority
                </Badge>
              </div>

              {/* Extracted Entities */}
              {(classification.extracted_entities.people?.length || 
                classification.extracted_entities.dates?.length ||
                classification.extracted_entities.actionVerbs?.length) ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  {classification.extracted_entities.people?.length ? (
                    <p>👤 People: {classification.extracted_entities.people.join(', ')}</p>
                  ) : null}
                  {classification.extracted_entities.dates?.length ? (
                    <p>📅 Dates: {classification.extracted_entities.dates.join(', ')}</p>
                  ) : null}
                  {classification.extracted_entities.actionVerbs?.length ? (
                    <p>⚡ Actions: {classification.extracted_entities.actionVerbs.join(', ')}</p>
                  ) : null}
                </div>
              ) : null}

              {/* Suggested Actions */}
              {classification.suggested_actions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Suggested Actions:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {classification.suggested_actions.map((action, i) => (
                      <span 
                        key={i} 
                        className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Override Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category Override</Label>
              <Select 
                value={overrideCategory || ''} 
                onValueChange={(v) => setOverrideCategory(v as TaskCategory || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority Override</Label>
              <Select 
                value={overridePriority || ''} 
                onValueChange={(v) => setOverridePriority(v as TaskPriority || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {priorities.map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status (only for editing) */}
          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assigned">Assigned To</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="assigned"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Enter name"
                className="pl-10"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <SheetFooter className="flex gap-2">
            {isEditing && onDelete && task && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(task.id);
                }}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gradient-primary">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
