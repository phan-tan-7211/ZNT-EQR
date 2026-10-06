import { useI18n } from '@/i18n';
import { lazy, Suspense } from 'react';
import { handleKeyboardActivation } from '@/components/a11y/keyboard';
import { Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryCompatibleEquipmentPicker } from '@/features/inventory/components/InventoryCompatibleEquipmentPicker';
import InventoryQRCodeDisplay from '@/features/inventory/components/InventoryQRCodeDisplay';
import { InventoryItemForm } from '@/features/inventory/components/InventoryItemForm';
import { InventoryItemAdjustQuantityDialog } from '@/features/inventory/pages/components/InventoryItemAdjustQuantityDialog';
import type { PartAlternateGroup, PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';
import type { InventoryItem } from '@/features/inventory/types/inventory';
const CompatibilityRulesEditor = lazy(() =>
  import('@/features/inventory/components/CompatibilityRulesEditor').then((module) => ({
    default: module.CompatibilityRulesEditor,
  })),
);

type EquipmentSummary = {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
};

type InventoryItemDetailDialogsProps = {
  item: InventoryItem;
  itemId: string;
  transactionCount: number;
  isMobile: boolean;
  showEditForm: boolean;
  setShowEditForm: (open: boolean) => void;
  showDeleteConfirmation: boolean;
  setShowDeleteConfirmation: (open: boolean) => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  showQRCode: boolean;
  setShowQRCode: (open: boolean) => void;
  adjustQuantity: {
    showAdjustDialog: boolean;
    handleAdjustOpenChange: (open: boolean) => void;
    showAddInput: boolean;
    showSubtractInput: boolean;
    adjustmentAmount: number;
    setAdjustmentAmount: (value: number) => void;
    adjustReason: string;
    setAdjustReason: (value: string) => void;
    handleQuickAdd: () => void;
    handleQuickTake: () => void;
    handleShowAddMore: () => void;
    handleShowTakeMore: () => void;
    handleCancelInput: () => void;
    handleSubmitMore: () => void;
    adjustMutationPending: boolean;
  };
  equipmentDialog: {
    showAddEquipmentDialog: boolean;
    setShowAddEquipmentDialog: (open: boolean) => void;
    equipmentSearch: string;
    setEquipmentSearch: (value: string) => void;
    selectedEquipmentIds: string[];
    handleSaveEquipmentCompatibility: () => Promise<void>;
    handleEquipmentToggle: (equipmentId: string, checked: boolean) => void;
    bulkLinkPending: boolean;
  };
  allEquipment: EquipmentSummary[];
  showEditRules: boolean;
  setShowEditRules: (open: boolean) => void;
  editingRules: PartCompatibilityRuleFormData[];
  setEditingRules: (rules: PartCompatibilityRuleFormData[]) => void;
  bulkSetRulesPending: boolean;
  onSaveCompatibilityRules: () => Promise<void>;
  alternateGroups: {
    showCreateGroupDialog: boolean;
    setShowCreateGroupDialog: (open: boolean) => void;
    showAddToGroupDialog: boolean;
    setShowAddToGroupDialog: (open: boolean) => void;
    newGroupName: string;
    setNewGroupName: (value: string) => void;
    selectedGroupId: string | null;
    setSelectedGroupId: (value: string | null) => void;
    groupSearch: string;
    setGroupSearch: (value: string) => void;
    filteredGroups: PartAlternateGroup[];
    availableGroupsCount: number;
    handleCreateGroupWithItem: () => Promise<void>;
    handleAddToGroup: () => Promise<void>;
    createGroupPending: boolean;
    addToGroupPending: boolean;
  };
  onDelete: () => Promise<void>;
};

export function InventoryItemDetailDialogs({
  item,
  itemId,
  transactionCount,
  isMobile,
  showEditForm,
  setShowEditForm,
  showDeleteConfirmation,
  setShowDeleteConfirmation,
  showDeleteDialog,
  setShowDeleteDialog,
  showQRCode,
  setShowQRCode,
  adjustQuantity,
  equipmentDialog,
  allEquipment,
  showEditRules,
  setShowEditRules,
  editingRules,
  setEditingRules,
  bulkSetRulesPending,
  onSaveCompatibilityRules,
  alternateGroups,
  onDelete,
}: InventoryItemDetailDialogsProps) {
  const { t } = useI18n();
  const outlineSecondaryClass = isMobile ? 'border-2 border-input bg-muted/25 hover:bg-muted/40' : '';

  return (
    <>
      {showEditForm && (
        <InventoryItemForm
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          editingItem={item}
        />
      )}

      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventoryDetail.deleteInventoryItem')}</DialogTitle>
            <DialogDescription>
              {t('inventoryDetail.deleteConfirm', { name: item.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirmation(false)}>
              {t('inventoryDetail.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteConfirmation(false);
                setShowDeleteDialog(true);
              }}
            >
              {t('inventoryDetail.continue')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventoryDetail.finalConfirmation')}</DialogTitle>
            <DialogDescription>
              {t('inventoryDetail.deleteFinal', { name: item.name, count: transactionCount })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setShowDeleteConfirmation(false);
              }}
            >
              {t('inventoryDetail.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void onDelete()}>
              {t('inventoryDetail.deletePermanently')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InventoryQRCodeDisplay
        open={showQRCode}
        onClose={() => setShowQRCode(false)}
        itemId={itemId}
        itemName={item.name}
      />

      <InventoryItemAdjustQuantityDialog
        isMobile={isMobile}
        open={adjustQuantity.showAdjustDialog}
        onOpenChange={adjustQuantity.handleAdjustOpenChange}
        currentQuantity={item.quantity_on_hand}
        showAddInput={adjustQuantity.showAddInput}
        showSubtractInput={adjustQuantity.showSubtractInput}
        adjustmentAmount={adjustQuantity.adjustmentAmount}
        adjustReason={adjustQuantity.adjustReason}
        isPending={adjustQuantity.adjustMutationPending}
        outlineSecondaryClass={outlineSecondaryClass}
        onAdjustmentAmountChange={adjustQuantity.setAdjustmentAmount}
        onAdjustReasonChange={adjustQuantity.setAdjustReason}
        onQuickAdd={adjustQuantity.handleQuickAdd}
        onQuickTake={adjustQuantity.handleQuickTake}
        onShowAddMore={adjustQuantity.handleShowAddMore}
        onShowTakeMore={adjustQuantity.handleShowTakeMore}
        onCancelInput={adjustQuantity.handleCancelInput}
        onSubmitMore={adjustQuantity.handleSubmitMore}
      />

      <Dialog open={equipmentDialog.showAddEquipmentDialog} onOpenChange={equipmentDialog.setShowAddEquipmentDialog}>
        <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventoryDetail.manageCompatibleEquipment')}</DialogTitle>
            <DialogDescription>
              {t('inventoryDetail.selectEquipment')}
            </DialogDescription>
          </DialogHeader>
          <div className="min-w-0 space-y-4">
            <InventoryCompatibleEquipmentPicker
              allEquipment={allEquipment}
              searchValue={equipmentDialog.equipmentSearch}
              onSearchChange={equipmentDialog.setEquipmentSearch}
              selectedEquipmentIds={equipmentDialog.selectedEquipmentIds}
              onToggle={equipmentDialog.handleEquipmentToggle}
              searchPlaceholder={t('inventoryDetail.searchEquipment')}
              noEquipmentText={t('inventoryDetail.noEquipmentAvailable')}
              noMatchesText={t('inventoryDetail.noEquipmentFound')}
              selectedBadgeLabel={t('inventoryDetail.selected')}
            />
            <div className="flex flex-wrap justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => equipmentDialog.setShowAddEquipmentDialog(false)}>
                {t('inventoryDetail.cancel')}
              </Button>
              <Button
                onClick={() => void equipmentDialog.handleSaveEquipmentCompatibility()}
                disabled={equipmentDialog.bulkLinkPending}
              >
                {equipmentDialog.bulkLinkPending ? t('inventoryDetail.saving') : t('inventoryDetail.saveChanges')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditRules} onOpenChange={setShowEditRules}>
        <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventoryDetail.editCompatibilityRules')}</DialogTitle>
            <DialogDescription>
              {t('inventoryDetail.defineRules')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {showEditRules && (
              <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                <CompatibilityRulesEditor
                  rules={editingRules}
                  onChange={setEditingRules}
                  disabled={bulkSetRulesPending}
                />
              </Suspense>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditRules(false)} disabled={bulkSetRulesPending}>
                {t('inventoryDetail.cancel')}
              </Button>
              <Button onClick={() => void onSaveCompatibilityRules()} disabled={bulkSetRulesPending}>
                {bulkSetRulesPending ? t('inventoryDetail.saving') : t('inventoryDetail.saveRules')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alternateGroups.showCreateGroupDialog} onOpenChange={alternateGroups.setShowCreateGroupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('inventoryDetail.createAlternateGroup')}</DialogTitle>
            <DialogDescription>
              {t('inventoryDetail.createAlternateHint')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">
                {t('inventoryDetail.groupName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group-name"
                placeholder={t('inventoryDetail.groupExample')}
                value={alternateGroups.newGroupName}
                onChange={(e) => alternateGroups.setNewGroupName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('inventoryDetail.groupNameHint')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  alternateGroups.setShowCreateGroupDialog(false);
                  alternateGroups.setNewGroupName('');
                }}
                disabled={alternateGroups.createGroupPending || alternateGroups.addToGroupPending}
              >
                {t('inventoryDetail.cancel')}
              </Button>
              <Button
                onClick={() => void alternateGroups.handleCreateGroupWithItem()}
                disabled={
                  !alternateGroups.newGroupName.trim() ||
                  alternateGroups.createGroupPending ||
                  alternateGroups.addToGroupPending
                }
              >
                {alternateGroups.createGroupPending || alternateGroups.addToGroupPending
                  ? t('inventoryDetail.creating')
                  : t('inventoryDetail.createGroup')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alternateGroups.showAddToGroupDialog} onOpenChange={alternateGroups.setShowAddToGroupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('inventoryDetail.addToAlternateGroup')}</DialogTitle>
            <DialogDescription>
              {t('inventoryDetail.selectExistingGroup')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('inventoryDetail.searchGroups')}
                value={alternateGroups.groupSearch}
                onChange={(e) => alternateGroups.setGroupSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
              {alternateGroups.filteredGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {alternateGroups.availableGroupsCount === 0
                    ? t('inventoryDetail.noAvailableGroups')
                    : t('inventoryDetail.noGroupsFound')}
                </p>
              ) : (
                alternateGroups.filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    role="button"
                    tabIndex={0}
                    className={`p-3 rounded cursor-pointer hover:bg-muted/50 ${
                      alternateGroups.selectedGroupId === group.id
                        ? 'bg-primary/10 border border-primary'
                        : 'border border-transparent'
                    }`}
                    onClick={() => alternateGroups.setSelectedGroupId(group.id)}
                    onKeyDown={(e) =>
                      handleKeyboardActivation(e, () => alternateGroups.setSelectedGroupId(group.id))
                    }
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{group.name}</p>
                      {group.status === 'verified' && (
                        <Badge className="bg-success text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('inventoryDetail.verified')}
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  alternateGroups.setShowAddToGroupDialog(false);
                  alternateGroups.setSelectedGroupId(null);
                  alternateGroups.setGroupSearch('');
                }}
                disabled={alternateGroups.addToGroupPending}
              >
                {t('inventoryDetail.cancel')}
              </Button>
              <Button
                onClick={() => void alternateGroups.handleAddToGroup()}
                disabled={!alternateGroups.selectedGroupId || alternateGroups.addToGroupPending}
              >
                {alternateGroups.addToGroupPending ? t('inventoryDetail.adding') : t('inventoryDetail.addToGroup')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
