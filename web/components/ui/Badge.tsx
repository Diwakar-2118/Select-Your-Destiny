import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'gradient';

const tones: Record<BadgeTone, string> = {
  primary: 'bg-primary-50 text-primary-700',
  secondary: 'bg-secondary-50 text-secondary-700',
  accent: 'bg-accent-50 text-accent-600',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-gray-100 text-gray-700',
  gradient: 'gradient-brand text-white',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

export function Badge({ tone = 'primary', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}
