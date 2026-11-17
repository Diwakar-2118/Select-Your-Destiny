import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'white' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}

const v = {
  default: 'bg-card',
  white: 'bg-white border border-gray-100 shadow-soft',
  glass: 'glass',
  gradient: 'gradient-brand text-white',
};
const p = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-7' };

export function Card({ variant = 'white', padding = 'md', hover, as: Tag = 'div', className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-2xl',
        v[variant],
        p[padding],
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
      {...rest}
    />
  );
}
