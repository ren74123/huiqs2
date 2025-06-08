import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function sanitizeEditorContent(content: string): string {
  if (!content) return '';
  
  // Remove any potentially dangerous HTML tags and attributes
  const sanitized = content
    // Remove script tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove onclick and similar event handlers
    .replace(/ on\w+="[^"]*"/g, '')
    // Remove javascript: URLs
    .replace(/javascript:[^\s"']+/g, '')
    // Remove data: URLs
    .replace(/data:[^\s"']+/g, '')
    // Remove other potentially dangerous attributes
    .replace(/(document|window|eval|setTimeout|setInterval)\s*\./g, '')
    // Trim whitespace
    .trim();

  return sanitized;
}