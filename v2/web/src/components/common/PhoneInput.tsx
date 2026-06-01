import { forwardRef, type InputHTMLAttributes } from 'react';
import { formatPhone } from '@/utils/mask';

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * 연락처 입력 필드 — 숫자 입력 시 자동으로 010-1234-5678 형식 변환
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, value, onChange, className = '', ...rest }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      onChange(formatPhone(e.target.value));
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder="010-0000-0000"
          className={`w-full rounded-md border ${error ? 'border-red-400' : 'border-gray-300'} px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${className}`}
          {...rest}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
PhoneInput.displayName = 'PhoneInput';
