'use client';

import React, { forwardRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'white';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'gradient-brand text-white shadow-lift hover:brightness-110',
  secondary: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
  outline: 'border-2 border-primary/30 text-primary-700 bg-white hover:border-primary hover:bg-primary-50',
  ghost: 'text-ink hover:bg-card',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  accent: 'bg-accent text-white hover:bg-accent-600 shadow-md',
  white: 'bg-white text-ink shadow-soft hover:bg-gray-50 border border-gray-200',
};
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-4 text-sm',
  md: 'min-h-[44px] px-5 text-sm sm:text-base',
  lg: 'min-h-[52px] px-7 text-base sm:text-lg',
  icon: 'h-11 w-11 p-0',
};

/** Accessible button with material-like ripple, loading state and icons. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, className, children, disabled, onClick, type = 'button', ...rest },
  ref,
) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      const d = Math.max(rect.width, rect.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = `${d}px`;
      span.style.left = `${e.clientX - rect.left - d / 2}px`;
      span.style.top = `${e.clientY - rect.top - d / 2}px`;
      btn.appendChild(span);
      setTimeout(() => span.remove(), 650);
      onClick?.(e);
    },
    [onClick],
  );

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={handleClick}
      className={cn(
        'ripple-container inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
