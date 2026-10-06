import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SelectedEquipmentBadgeList } from '@/components/common/SelectedEquipmentBadgeList';
import {
  InventoryEquipmentPickerRow,
  type InventoryEquipmentPickerItem,
} from '@/features/inventory/components/InventoryEquipmentPickerRow';

// Canonical compatible-equipment picker pattern follows the Equipment-side management dialog.
// Keep form/detail consumers on this shared component so sizing and selected-state cannot drift.
export const COMPATIBLE_EQUIPMENT_LIST_CLASS =
  'max-h-48 overflow-y-auto border rounded-md p-2 space-y-2 md:h-[clamp(20rem,42dvh,30rem)] md:max-h-[calc(100dvh-20rem)]';

type InventoryCompatibleEquipmentPickerProps = {
  allEquipment: InventoryEquipmentPickerItem[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedEquipmentIds: string[];
  onToggle: (equipmentId: string, checked: boolean) => void;
  searchPlaceholder: string;
  noEquipmentText: string;
  noMatchesText?: string;
  selectedBadgeLabel: string;
};

export function InventoryCompatibleEquipmentPicker({
  allEquipment,
  searchValue,
  onSearchChange,
  selectedEquipmentIds,
  onToggle,
  searchPlaceholder,
  noEquipmentText,
  noMatchesText,
  selectedBadgeLabel,
}: InventoryCompatibleEquipmentPickerProps) {
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredEquipment = allEquipment.filter(
    (equipment) =>
      equipment.name.toLowerCase().includes(normalizedSearch) ||
      (equipment.manufacturer ?? '').toLowerCase().includes(normalizedSearch) ||
      (equipment.model ?? '').toLowerCase().includes(normalizedSearch),
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className={COMPATIBLE_EQUIPMENT_LIST_CLASS}>
        {filteredEquipment.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {allEquipment.length === 0 ? noEquipmentText : (noMatchesText ?? noEquipmentText)}
          </p>
        ) : (
          filteredEquipment.map((equipment) => (
            <InventoryEquipmentPickerRow
              key={equipment.id}
              equipment={equipment}
              isSelected={selectedEquipmentIds.includes(equipment.id)}
              onToggle={onToggle}
              selectedBadgeLabel={selectedBadgeLabel}
            />
          ))
        )}
      </div>

      <SelectedEquipmentBadgeList
        selectedEquipmentIds={selectedEquipmentIds}
        allEquipment={allEquipment}
        onRemove={(id) => onToggle(id, false)}
        removeControl="button"
      />
    </div>
  );
}
