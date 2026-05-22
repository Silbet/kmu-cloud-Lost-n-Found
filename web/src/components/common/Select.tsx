import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...rest }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>}
        <select
          ref={ref}
          className={`w-full rounded-md border ${error ? 'border-red-400' : 'border-gray-300'} px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 ${className}`}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
