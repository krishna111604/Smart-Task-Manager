import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { classifyTask } from '@/lib/classification';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { Json } from '@/integrations/supabase/types';

export type TaskCategory = 'scheduling' | 'finance' | 'technical' | 'safety' | 'general';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  due_date: string | null;
  extracted_entities: Json | null;
  suggested_actions: Json | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  search?: string;
}

export interface TaskCounts {
  pending: number;
  in_progress: number;
  completed: number;
}

export function useTasks(filters?: TaskFilters) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<TaskCounts>({ pending: 0, in_progress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setCounts({ pending: 0, in_progress: 0, completed: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tasks',
        variant: 'destructive',
      });
    } else {
      // Cast the data to Task type
      const typedTasks = (data || []) as Task[];
      setTasks(typedTasks);
    }

    // Fetch counts separately (unfiltered)
    await fetchCounts();
    setLoading(false);
  }, [user, filters?.status, filters?.category, filters?.priority, filters?.search, toast]);

  const fetchCounts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('status');

    if (!error && data) {
      const newCounts = {
        pending: data.filter(t => t.status === 'pending').length,
        in_progress: data.filter(t => t.status === 'in_progress').length,
        completed: data.filter(t => t.status === 'completed').length,
      };
      setCounts(newCounts);
    }
  };

  const createTask = async (data: {
    title: string;
    description: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    assigned_to?: string;
    due_date?: string;
  }) => {
    if (!user) return null;

    const classification = classifyTask(data.title, data.description);

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        title: data.title,
        description: data.description,
        category: data.category || classification.category,
        priority: data.priority || classification.priority,
        status: 'pending' as TaskStatus,
        assigned_to: data.assigned_to || null,
        due_date: data.due_date || null,
        extracted_entities: classification.extracted_entities as Json,
        suggested_actions: classification.suggested_actions as Json,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Task Created',
      description: `"${newTask.title}" classified as ${newTask.category} with ${newTask.priority} priority.`,
    });

    return newTask as Task;
  };

  const updateTask = async (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'category' | 'priority' | 'status' | 'assigned_to' | 'due_date'>>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Task Updated',
      description: `"${data.title}" has been updated.`,
    });

    return data as Task;
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Task Deleted',
      description: 'The task has been removed.',
      variant: 'destructive',
      duration: 1000,
    });

    return true;
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    return updateTask(id, { status });
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTasks]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    counts,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  };
}
