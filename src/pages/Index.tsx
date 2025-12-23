import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, TaskCategory, TaskPriority, TaskStatus } from '@/hooks/useTasks';
import { useNotifications } from '@/hooks/useNotifications';
import { TaskCard } from '@/components/TaskCard';
import { StatsCard } from '@/components/StatsCard';
import { TaskForm } from '@/components/TaskForm';
import { FilterBar } from '@/components/FilterBar';
import { EmptyState } from '@/components/EmptyState';
import { UserMenu } from '@/components/UserMenu';
import { NotificationInbox } from '@/components/NotificationInbox';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportTasksToCSV } from '@/lib/csvExport';
import { Plus, ListTodo, Clock, CheckCircle2, RefreshCw, Zap, Download, Loader2, BarChart3 } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ReturnType<typeof useTasks>['tasks'][0] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  const filters = useMemo(() => ({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    search: search || undefined,
  }), [search, categoryFilter, priorityFilter, statusFilter]);

  const { tasks, counts, loading, fetchTasks, createTask, updateTask, deleteTask, updateTaskStatus } = useTasks(filters);
  const { sendManualReminder } = useNotifications();

  const hasActiveFilters = search !== '' || categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all';

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTasks();
    setIsRefreshing(false);
  };

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => {
    await createTask(data);
    setIsFormOpen(false);
  };

  const handleUpdateTask = async (data: {
    title: string;
    description: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    assigned_to?: string;
    due_date?: string;
    status?: TaskStatus;
  }) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, data);
    setEditingTask(null);
    setIsFormOpen(false);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    setEditingTask(null);
    setIsFormOpen(false);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTaskStatus(taskId, newStatus);
  };

  const handleExportCSV = () => {
    exportTasksToCSV(tasks);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  const totalTasks = counts.pending + counts.in_progress + counts.completed;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 glass">
        <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl gradient-primary flex-shrink-0">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold truncate">Smart Task Manager</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Auto-classify and organize your tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={tasks.length === 0}
                className="hidden md:flex"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleExportCSV}
                disabled={tasks.length === 0}
                className="md:hidden h-8 w-8 sm:h-9 sm:w-9"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                onClick={() => setIsFormOpen(true)} 
                className="gradient-primary shadow-glow h-8 sm:h-9 px-2 sm:px-4"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Task</span>
              </Button>
              <NotificationInbox />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <StatsCard
            title="Total Tasks"
            value={totalTasks}
            icon={ListTodo}
            variant="total"
            onClick={() => clearFilters()}
            isActive={!hasActiveFilters}
          />
          <StatsCard
            title="Pending"
            value={counts.pending}
            icon={Clock}
            variant="pending"
            onClick={() => {
              clearFilters();
              setStatusFilter('pending');
            }}
            isActive={statusFilter === 'pending'}
          />
          <StatsCard
            title="In Progress"
            value={counts.in_progress}
            icon={RefreshCw}
            variant="in-progress"
            onClick={() => {
              clearFilters();
              setStatusFilter('in_progress');
            }}
            isActive={statusFilter === 'in_progress'}
          />
          <StatsCard
            title="Completed"
            value={counts.completed}
            icon={CheckCircle2}
            variant="completed"
            onClick={() => {
              clearFilters();
              setStatusFilter('completed');
            }}
            isActive={statusFilter === 'completed'}
          />
        </div>

        {/* Tabs for Tasks and Analytics */}
        <Tabs defaultValue="tasks" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full max-w-xs sm:max-w-md grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-1 sm:gap-2 text-sm">
              <ListTodo className="h-4 w-4" />
              <span>Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 sm:space-y-6">
            {/* Filters */}
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              category={categoryFilter}
              onCategoryChange={setCategoryFilter}
              priority={priorityFilter}
              onPriorityChange={setPriorityFilter}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {/* Task List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                hasFilters={hasActiveFilters}
                onCreateTask={() => setIsFormOpen(true)}
                onClearFilters={clearFilters}
              />
            ) : (
              <div className="grid gap-3">
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TaskCard
                      task={task}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setIsFormOpen(true);
                      }}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                      onSendReminder={sendManualReminder}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Results count */}
            {!loading && tasks.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Showing {tasks.length} of {totalTasks} tasks
              </p>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard tasks={tasks} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Task Form Sheet */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
