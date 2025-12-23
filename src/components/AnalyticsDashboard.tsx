import { useMemo } from 'react';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, PieChartIcon, BarChart3 } from 'lucide-react';

interface AnalyticsDashboardProps {
  tasks: Task[];
}

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  scheduling: 'hsl(var(--chart-1))',
  finance: 'hsl(var(--chart-2))',
  technical: 'hsl(var(--chart-3))',
  safety: 'hsl(var(--chart-4))',
  general: 'hsl(var(--chart-5))',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'hsl(var(--destructive))',
  medium: 'hsl(var(--warning))',
  low: 'hsl(var(--status-completed))',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'hsl(var(--status-pending))',
  in_progress: 'hsl(var(--status-in-progress))',
  completed: 'hsl(var(--status-completed))',
};

export function AnalyticsDashboard({ tasks }: AnalyticsDashboardProps) {
  const categoryData = useMemo(() => {
    const counts: Record<TaskCategory, number> = {
      scheduling: 0,
      finance: 0,
      technical: 0,
      safety: 0,
      general: 0,
    };
    tasks.forEach(task => {
      counts[task.category]++;
    });
    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: CATEGORY_COLORS[name as TaskCategory],
      }));
  }, [tasks]);

  const priorityData = useMemo(() => {
    const counts: Record<TaskPriority, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };
    tasks.forEach(task => {
      counts[task.priority]++;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: PRIORITY_COLORS[name as TaskPriority],
    }));
  }, [tasks]);

  const statusData = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
    };
    tasks.forEach(task => {
      counts[task.status]++;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace('_', ' ').charAt(0).toUpperCase() + name.replace('_', ' ').slice(1),
      value,
      fill: STATUS_COLORS[name as TaskStatus],
    }));
  }, [tasks]);

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} task{payload[0].value !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  if (tasks.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No tasks to analyze. Create some tasks to see analytics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {/* Completion Rate Card */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Completion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="text-2xl sm:text-3xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {tasks.filter(t => t.status === 'completed').length} of {tasks.length} tasks completed
          </p>
          <div className="mt-3 sm:mt-4 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-status-completed transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Category Distribution</CardTitle>
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Priority Breakdown */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Priority Breakdown</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Status Overview - Full Width */}
      <Card className="bg-card/50 backdrop-blur-sm md:col-span-2 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
