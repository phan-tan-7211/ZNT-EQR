import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { extractEquipmentDisplayImagePath } from '@/services/imageUploadService';
import {
  parseDisplayImageRef,
  removeDisplayImageSet,
  uploadDisplayImageSet,
  type UploadedDisplayImageSet,
} from '@/services/displayImageStorageService';
import { getEquipmentDisplayImageRef } from '@/features/equipment/services/equipmentDisplayImageRefService';

const DISPLAY_IMAGE_RESOLUTION_ERROR =
  'Could not resolve that image to a durable storage path. Choose an image from work orders or equipment notes again.';

export interface UploadEquipmentDisplayImageInput {
  organizationId: string;
  equipmentId: string;
  source: File;
  imageSetId?: string;
}

function normalizeEquipmentDisplayImageRef(
  organizationId: string,
  equipmentId: string,
  imageUrl: string,
): string | null {
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  const parsed = parseDisplayImageRef(trimmed);
  if (parsed) {
    if (
      parsed.entity !== 'equipment' ||
      parsed.organizationId !== organizationId ||
      parsed.entityId !== equipmentId
    ) {
      throw new Error(DISPLAY_IMAGE_RESOLUTION_ERROR);
    }
    return parsed.canonicalRef;
  }

  if (
    trimmed === 'display-images' ||
    trimmed.startsWith('display-images/')
  ) {
    throw new Error(DISPLAY_IMAGE_RESOLUTION_ERROR);
  }

  const legacyPath = extractEquipmentDisplayImagePath(trimmed);
  if (!legacyPath) {
    throw new Error(DISPLAY_IMAGE_RESOLUTION_ERROR);
  }

  return legacyPath;
}

async function commitEquipmentDisplayImageRef(
  organizationId: string,
  equipmentId: string,
  nextRef: string | null,
  previousRef: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('equipment')
    .update({ image_url: nextRef })
    .eq('id', equipmentId)
    .eq('organization_id', organizationId);

  if (error) throw error;

  const previousParsed = previousRef ? parseDisplayImageRef(previousRef) : null;
  if (
    previousParsed &&
    previousParsed.entity === 'equipment' &&
    previousParsed.organizationId === organizationId &&
    previousParsed.entityId === equipmentId &&
    previousParsed.canonicalRef !== nextRef
  ) {
    try {
      await removeDisplayImageSet(previousParsed.canonicalRef);
    } catch (cleanupError) {
      logger.warn('Failed to remove the previous Equipment display image set', {
        organizationId,
        equipmentId,
        previousRef: previousParsed.canonicalRef,
        error: cleanupError,
      });
    }
  }
}

export async function uploadEquipmentDisplayImage(
  input: UploadEquipmentDisplayImageInput,
): Promise<UploadedDisplayImageSet> {
  return uploadDisplayImageSet({
    entity: 'equipment',
    organizationId: input.organizationId,
    entityId: input.equipmentId,
    imageSetId: input.imageSetId,
    source: input.source,
  });
}

export async function replaceEquipmentDisplayImage(
  input: UploadEquipmentDisplayImageInput,
): Promise<string> {
  const previousRef = await getEquipmentDisplayImageRef(
    input.organizationId,
    input.equipmentId,
  );
  const uploaded = await uploadEquipmentDisplayImage(input);

  await commitEquipmentDisplayImageRef(
    input.organizationId,
    input.equipmentId,
    uploaded.canonicalRef,
    previousRef,
  );

  return uploaded.canonicalRef;
}

export async function setEquipmentDisplayImageRef(
  organizationId: string,
  equipmentId: string,
  imageUrl: string,
): Promise<void> {
  const previousRef = await getEquipmentDisplayImageRef(
    organizationId,
    equipmentId,
  );
  const nextRef = normalizeEquipmentDisplayImageRef(
    organizationId,
    equipmentId,
    imageUrl,
  );

  await commitEquipmentDisplayImageRef(
    organizationId,
    equipmentId,
    nextRef,
    previousRef,
  );
}

export async function removeEquipmentDisplayImage(
  organizationId: string,
  equipmentId: string,
): Promise<void> {
  await setEquipmentDisplayImageRef(organizationId, equipmentId, '');
}
