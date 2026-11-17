'use client';

import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, leftIcon, className, containerClassName, id, required, ...rest },
  ref,
) {
  const auto = useId();
  const sid = id || auto;
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={sid} className="mb-1.5 block text-sm font-medium text-ink">
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
        <select
          ref={ref}
          id={sid}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${sid}-err` : undefined}
          className={cn(
            'min-h-[48px] w-full appearance-none rounded-2xl border bg-white px-4 pr-10 text-ink transition focus:border-primary focus:ring-4 focus:ring-primary/15',
            leftIcon && 'pl-11',
            error ? 'border-red-400' : 'border-gray-200',
            className,
          )}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
      {error && (
        <p id={`${sid}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
