import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString, language = 'en') {
  const date = new Date(dateString);
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTime(timeString) {
  return timeString;
}

export function getGradeColor(grade) {
  if (grade >= 90) return 'text-green-600 dark:text-green-400';
  if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
  if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
  if (grade >= 60) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function getRiskColor(risk) {
  switch (risk) {
    case 'high': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    default: return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
  }
}

export function getEventColor(type) {
  switch (type?.toLowerCase()) {
    case 'lecture': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'quiz': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
    case 'exam':
    case 'midterm':
    case 'final': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    case 'assignment': return 'bg-primary/10 text-primary';
    case 'project': return 'bg-secondary/10 text-secondary';
    case 'lab': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    case 'study': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    case 'rest': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

export { markToLetter as gradeToLetter, getGradeStatus } from './gradeUtils';

export function getGradeStatusColor(status) {
  switch (status) {
    case 'safe': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    case 'normal': return 'bg-blue-500/15 text-blue-700 dark:text-blue-400';
    case 'at_risk': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
    case 'high_risk': return 'bg-red-500/15 text-red-700 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}
