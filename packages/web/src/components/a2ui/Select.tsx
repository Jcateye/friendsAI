import { useState, ChangeEvent } from 'react';
import { A2UIComponentProps, A2UISelectProps } from './types';

export function A2UISelect({ node }: A2UIComponentProps) {
  if (node.type !== 'select') {
    return null;
  }

  const props = node.props as A2UISelectProps;
  const {
    name,
    label,
    placeholder,
    multiple = false,
    options,
    value: initialValue,
  } = props;

  const [value, setValue] = useState<string | number | (string | number)[]>(
    initialValue !== undefined
      ? initialValue
      : multiple
      ? []
      : ''
  );

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions, (option) => {
        const optionValue = options.find((opt) => opt.value.toString() === option.value);
        return optionValue?.value || option.value;
      });
      setValue(selectedOptions);
    } else {
      const selectedOption = options.find(
        (opt) => opt.value.toString() === e.target.value
      );
      setValue(selectedOption?.value || '');
    }
  };

  const selectClassName = [
    'w-full px-3 py-2 rounded-md border border-border bg-bg-card',
    'text-text-primary font-primary text-[15px]',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-text-primary font-primary">
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        multiple={multiple}
        value={
          multiple
            ? (value as (string | number)[]).map((v) => v.toString())
            : (value as string | number).toString()
        }
        onChange={handleChange}
        className={selectClassName}
        style={node.style}
        data-testid={node.testId}
      >
        {placeholder && !multiple && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option
            key={index}
            value={option.value.toString()}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {options.find((opt) => opt.value === value || (Array.isArray(value) && value.includes(opt.value)))?.description && (
        <p className="text-xs text-text-secondary font-primary">
          {options.find((opt) => opt.value === value || (Array.isArray(value) && value.includes(opt.value)))?.description}
        </p>
      )}
    </div>
  );
}








