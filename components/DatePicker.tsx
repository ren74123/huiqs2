import React, { forwardRef } from 'react';
import ReactDatePicker, { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

interface DatePickerProps extends Omit<ReactDatePickerProps, 'onChange'> {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  className?: string;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  className = '',
  placeholder = '请选择日期',
  ...props
}: DatePickerProps) {
  // 将 ISO 字符串转换为 Date 对象
  const dateValue = value ? new Date(value) : null;

  // 自定义输入组件
  const CustomInput = forwardRef<HTMLDivElement, { value?: string; onClick?: () => void }>(
    ({ value, onClick }, ref) => (
      <div
        className={`relative flex items-center cursor-pointer ${className}`}
        onClick={onClick}
        ref={ref}
      >
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={value || ''}
          readOnly
          placeholder={placeholder}
          className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent cursor-pointer"
        />
      </div>
    )
  );

  // 格式化日期显示
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return dayjs(date).format('YYYY年MM月DD日');
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <ReactDatePicker
        selected={dateValue}
        onChange={(date: Date) => {
          // 将 Date 对象转换为 ISO 字符串
          const isoDate = date ? date.toISOString().split('T')[0] : '';
          onChange(isoDate);
        }}
        customInput={<CustomInput />}
        dateFormat="yyyy年MM月dd日"
        locale="zh-CN"
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}