import { useState } from 'react';
import { Check } from 'lucide-react';
import { A2UIComponentProps, A2UIAction } from '../types';

interface Template {
  id: string;
  name: string;
  description?: string;
  preview?: string;
}

interface TemplatePickerProps {
  templates: Template[];
  selectedId?: string;
  onSelect?: (templateId: string, action: A2UIAction) => void;
}

export function TemplatePicker({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'custom' || node.name !== 'template-picker') {
    return null;
  }

  const props = (node.props || {}) as TemplatePickerProps;
  const { templates = [], selectedId, onSelect } = props;

  const [selected, setSelected] = useState<string | undefined>(selectedId);

  const handleSelect = (templateId: string) => {
    setSelected(templateId);
    
    if (onSelect && onAction) {
      onAction({
        type: 'custom',
        name: 'select-template',
        payload: { templateId },
      });
    } else if (onAction) {
      onAction({
        type: 'custom',
        name: 'select-template',
        payload: { templateId },
      });
    }
  };

  return (
    <div
      className="flex flex-col gap-2"
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      {templates.map((template) => {
        const isSelected = selected === template.id;

        return (
          <button
            key={template.id}
            onClick={() => handleSelect(template.id)}
            className={`relative p-4 bg-bg-card border-2 rounded-md text-left transition-colors ${
              isSelected
                ? 'border-primary bg-primary-tint'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            <h4 className="text-base font-semibold text-text-primary font-display mb-1">
              {template.name}
            </h4>

            {template.description && (
              <p className="text-sm text-text-secondary font-primary mb-2">
                {template.description}
              </p>
            )}

            {template.preview && (
              <p className="text-xs text-text-muted font-primary bg-bg-surface p-2 rounded mt-2">
                {template.preview}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}



