import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...rest }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>}
        <textarea
          ref={ref}
          className={`w-full rounded-md border ${error ? 'border-red-400' : 'border-gray-300'} px-3 py-2 text-sm min-h-[96px] focus:outline-none focus:border-blue-500 ${className}`}
          {...rest}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
