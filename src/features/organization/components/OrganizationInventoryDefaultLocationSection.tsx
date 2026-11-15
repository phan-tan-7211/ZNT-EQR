import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { StructuredLocationEditorControls } from '@/components/location/StructuredLocationEditorControls';
import { useStructuredLocationEditorState } from '@/components/location/structuredLocationEditorState';
import { useStructuredLocationEditorControlsProps } from '@/components/location/useStructuredLocationEditorControlsProps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateOrganization } from '@/features/organization/services/organizationService';
import type { OrganizationUpdatePayload } from '@/features/organization/types/organization';
import {
  buildOrganizationInventoryDefaultAddress,
  organizationInventoryDefaultToPlaceData,
  placeDataToOrganizationInventoryDefaultLocation,
} from '@/features/inventory/utils/inventoryLocationUtils';
import type { SessionOrganization } from '@/types/session';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

type OrganizationInventoryDefaultLocationSectionProps = {
  organization: SessionOrganization;
  onSaved: () => Promise<void>;
};

export function OrganizationInventoryDefaultLocationSection({
  organization,
  onSaved,
}: OrganizationInventoryDefaultLocationSectionProps) {
  const { t } = useI18n();

  const [locationName, setLocationName] = useState(
    organization.inventoryDefaultLocationName ?? '',
  );
  const [isSaving, setIsSaving] = useState(false);

  const initialPlace = useMemo(
    () =>
      organizationInventoryDefaultToPlaceData({
        inventory_default_location_name: organization.inventoryDefaultLocationName,
        inventory_default_location_address: organization.inventoryDefaultLocationAddress,
        inventory_default_location_city: organization.inventoryDefaultLocationCity,
        inventory_default_location_state: organization.inventoryDefaultLocationState,
        inventory_default_location_country: organization.inventoryDefaultLocationCountry,
        inventory_default_location_lat: organization.inventoryDefaultLocationLat,
        inventory_default_location_lng: organization.inventoryDefaultLocationLng,
      }),
    [
      organization.inventoryDefaultLocationAddress,
      organization.inventoryDefaultLocationCity,
      organization.inventoryDefaultLocationCountry,
      organization.inventoryDefaultLocationLat,
      organization.inventoryDefaultLocationLng,
      organization.inventoryDefaultLocationName,
      organization.inventoryDefaultLocationState,
    ],
  );

  const editor = useStructuredLocationEditorState({
    initialPlace,
    fallbackAddress: buildOrganizationInventoryDefaultAddress({
      inventory_default_location_address: organization.inventoryDefaultLocationAddress,
      inventory_default_location_city: organization.inventoryDefaultLocationCity,
      inventory_default_location_state: organization.inventoryDefaultLocationState,
      inventory_default_location_country: organization.inventoryDefaultLocationCountry,
    }),
  });

  const locationControlsProps = useStructuredLocationEditorControlsProps(editor);

  useEffect(() => {
    setLocationName(organization.inventoryDefaultLocationName ?? '');
  }, [organization.inventoryDefaultLocationName, organization.id]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const payload: OrganizationUpdatePayload = {
        inventory_default_location_name: locationName.trim() || null,
        ...placeDataToOrganizationInventoryDefaultLocation(
          editor.isCleared ? null : editor.pendingPlace,
        ),
      };

      const success = await updateOrganization(organization.id, payload);
      if (!success) {
        throw new Error('Failed to update organization');
      }

      await onSaved();
      toast.success(t('organizationHub.inventoryLocationSaved'));
    } catch (error) {
      console.error('Error saving inventory default location:', error);
      toast.error(t('organizationHub.inventoryLocationFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [editor.isCleared, editor.pendingPlace, locationName, onSaved, organization.id, t]);

  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
        <div className="pt-0.5">
          <h2 className="text-sm font-semibold">{t('organizationHub.inventoryLocation')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t('organizationHub.inventoryLocationDescription')}
          </p>
        </div>
        <div className="md:col-span-2 space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="inventory-default-location-name">{t('organizationHub.locationName')}</Label>
            <Input
              id="inventory-default-location-name"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder={t('organizationHub.locationNamePlaceholder')}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              {t('organizationHub.locationNameHelp')}
            </p>
          </div>

          <StructuredLocationEditorControls
            {...locationControlsProps}
            locationLabel={t('organizationHub.storageAddress')}
            liveCaptureTitle={t('organizationHub.deviceLocation')}
            liveCaptureConfirmLabel={t('organizationHub.useLocation')}
            isSaving={isSaving}
          />

          <div className="flex justify-stretch sm:justify-end">
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto gap-1.5"
              disabled={!editor.canSave || isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? t('organizationHub.saving') : t('organizationHub.saveLocation')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
