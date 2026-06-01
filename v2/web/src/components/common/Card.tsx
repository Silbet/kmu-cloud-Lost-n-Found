import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}
