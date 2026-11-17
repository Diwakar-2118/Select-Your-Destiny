'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  containerClassName?: string;
  srOnlyLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightSlot, className, containerClassName, id, srOnlyLabel, required, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id || auto;
  const descId = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className={cn('mb-1.5 block text-sm font-medium text-ink', srOnlyLabel && 'sr-only')}>
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={descId}
          className={cn(
            'min-h-[48px] w-full rounded-2xl border bg-white px-4 text-ink placeholder:text-gray-400 transition focus:border-primary focus:ring-4 focus:ring-primary/15',
            leftIcon && 'pl-11',
            rightSlot && 'pr-12',
            error ? 'border-red-400' : 'border-gray-200',
            className,
          )}
          {...rest}
        />
        {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
