import { Task } from '@/hooks/useTasks';
import { format } from 'date-fns';

export function exportTasksToCSV(tasks: Task[], filename?: string) {
  const headers = [
    'ID',
    'Title',
    'Description',
    'Category',
    'Priority',
    'Status',
    'Assigned To',
    'Due Date',
    'Created At',
    'Updated At',
  ];

  const rows = tasks.map(task => [
    task.id,
    `"${task.title.replace(/"/g, '""')}"`,
    `"${task.description.replace(/"/g, '""')}"`,
    task.category,
    task.priority,
    task.status,
    task.assigned_to || '',
    task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
    format(new Date(task.created_at), 'yyyy-MM-dd HH:mm:ss'),
    format(new Date(task.updated_at), 'yyyy-MM-dd HH:mm:ss'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `tasks-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
