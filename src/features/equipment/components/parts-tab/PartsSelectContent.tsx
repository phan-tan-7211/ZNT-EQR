import React from 'react';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { useI18n } from '@/i18n';

interface PartsSelectOption {
  value: string;
  labelKey: string;
}

interface PartsSelectContentProps {
  options: ReadonlyArray<PartsSelectOption>;
}

/**
 * Dropdown list shared by the desktop and mobile parts toolbars: one item per
 * option (sort or stock filter), labelled through i18n.
 */
export const PartsSelectContent: React.FC<PartsSelectContentProps> = ({ options }) => {
  const { t } = useI18n();

  return (
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {t(option.labelKey)}
        </SelectItem>
      ))}
    </SelectContent>
  );
};
