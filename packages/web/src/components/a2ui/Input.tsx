import { useState, ChangeEvent } from 'react';
import { A2UIComponentProps, A2UIInputProps } from './types';

export function A2UIInput({ node }: A2UIComponentProps) {
  if (node.type !== 'input') {
    return null;
  }

  const props = node.props as A2UIInputProps;
  const {
    name,
    label,
    placeholder,
    value: initialValue,
    required = false,
    type = 'text',
    multiline = false,
    rows = 3,
    min,
    max,
    step,
    pattern,
  } = props;

  const [value, setValue] = useState<string | number>(
    initialValue !== undefined ? initialValue : ''
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
    setValue(newValue);
  };

  const inputClassName = [
    'w-full px-3 py-2 rounded-md border border-border bg-bg-card',
    'text-text-primary font-primary text-[15px]',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ');

  const inputProps = {
    id: name,
    name,
    placeholder,
    value: value.toString(),
    onChange: handleChange,
    required,
    min,
    max,
    step,
    pattern,
    className: inputClassName,
    style: node.style,
    'data-testid': node.testId,
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-text-primary font-primary">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {multiline ? (
        <textarea {...inputProps} rows={rows} />
      ) : (
        <input {...inputProps} type={type} />
      )}
    </div>
  );
}





