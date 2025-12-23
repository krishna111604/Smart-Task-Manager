import { Task, TaskHistory, TaskFilters, TaskStatus } from '@/types/task';
import { classifyTask } from './classification';

// In-memory storage (simulating database)
let tasks: Task[] = [];
let taskHistory: TaskHistory[] = [];

// Generate UUID
function generateId(): string {
  return crypto.randomUUID();
}

// Get current timestamp
function now(): string {
  return new Date().toISOString();
}

// Create a new task with auto-classification
export function createTask(data: {
  title: string;
  description: string;
  assigned_to?: string;
  due_date?: string;
  category?: string;
  priority?: string;
}): Task {
  const classification = classifyTask(data.title, data.description);
  
  const task: Task = {
    id: generateId(),
    title: data.title,
    description: data.description,
    category: (data.category as Task['category']) || classification.category,
    priority: (data.priority as Task['priority']) || classification.priority,
    status: 'pending',
    assigned_to: data.assigned_to,
    due_date: data.due_date,
    extracted_entities: classification.extracted_entities,
    suggested_actions: classification.suggested_actions,
    created_at: now(),
    updated_at: now(),
  };

  tasks.push(task);

  // Add history entry
  const historyEntry: TaskHistory = {
    id: generateId(),
    task_id: task.id,
    action: 'created',
    new_value: { ...task },
    changed_at: now(),
  };
  taskHistory.push(historyEntry);

  return task;
}

// Get all tasks with optional filters
export function getTasks(filters?: TaskFilters): Task[] {
  let result = [...tasks];

  if (filters) {
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.category) {
      result = result.filter(t => t.category === filters.category);
    }
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }
  }

  // Sort by created_at descending
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return result;
}

// Get task by ID with history
export function getTaskById(id: string): { task: Task | null; history: TaskHistory[] } {
  const task = tasks.find(t => t.id === id) || null;
  const history = taskHistory.filter(h => h.task_id === id).sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );
  return { task, history };
}

// Update task
export function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>): Task | null {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) return null;

  const oldTask = { ...tasks[taskIndex] };
  const action: TaskHistory['action'] = updates.status && updates.status !== oldTask.status 
    ? (updates.status === 'completed' ? 'completed' : 'status_changed')
    : 'updated';

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...updates,
    updated_at: now(),
  };

  // Add history entry
  const historyEntry: TaskHistory = {
    id: generateId(),
    task_id: id,
    action,
    old_value: oldTask,
    new_value: { ...tasks[taskIndex] },
    changed_at: now(),
  };
  taskHistory.push(historyEntry);

  return tasks[taskIndex];
}

// Delete task
export function deleteTask(id: string): boolean {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) return false;

  tasks.splice(taskIndex, 1);
  // Keep history for audit purposes
  return true;
}

// Get task counts by status
export function getTaskCounts(): Record<TaskStatus, number> {
  return {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };
}

// Seed with sample tasks
export function seedTasks(): void {
  if (tasks.length > 0) return;

  const sampleTasks = [
    {
      title: 'Schedule urgent meeting with team today about budget allocation',
      description: 'Need to discuss Q4 budget with the finance team. Contact John and Sarah for availability.',
      assigned_to: 'John Smith',
      due_date: new Date().toISOString(),
    },
    {
      title: 'Fix critical bug in payment system',
      description: 'Users are experiencing errors during checkout. Deploy hotfix immediately.',
      assigned_to: 'Alex Developer',
      due_date: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      title: 'Conduct safety inspection at Site B',
      description: 'Quarterly compliance check for PPE and hazard identification. File report by Friday.',
      assigned_to: 'Safety Officer',
      due_date: new Date(Date.now() + 172800000).toISOString(),
    },
    {
      title: 'Review invoice from vendor',
      description: 'Check the expense report and approve payment for office supplies.',
      assigned_to: 'Finance Team',
      due_date: new Date(Date.now() + 259200000).toISOString(),
    },
    {
      title: 'Update server configuration',
      description: 'Maintain system performance by updating configuration. Soon this needs to be done.',
      assigned_to: 'DevOps Team',
      due_date: new Date(Date.now() + 432000000).toISOString(),
    },
  ];

  sampleTasks.forEach(data => createTask(data));
}
