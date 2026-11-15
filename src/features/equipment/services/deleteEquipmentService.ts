import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStoredObjectPath } from '@/services/imageUploadService';
import {
  isDisplayImageV2Ref,
  removeDisplayImageSet,
} from '@/services/displayImageStorageService';
import { getEquipmentDisplayImageRef } from '@/features/equipment/services/equipmentDisplayImageRefService';

export interface EquipmentDeletionImpact {
  workOrders: number;
  pmCount: number;
  equipmentNoteImages: number;
  workOrderImages: number;
}

interface EquipmentNoteImage {
  id: string;
  file_url: string;
}

interface WorkOrderWithImages {
  id: string;
  images: Array<{
    id: string;
    file_url: string;
  }>;
}

// Get equipment note images
const getEquipmentNoteImages = async (equipmentId: string): Promise<EquipmentNoteImage[]> => {
  const { data, error } = await supabase
    .from('equipment_note_images')
    .select(`
      id,
      file_url,
      equipment_notes!inner (
        equipment_id
      )
    `)
    .eq('equipment_notes.equipment_id', equipmentId);

  if (error) throw error;
  return data || [];
};

// Get work orders with their images
const getWorkOrdersWithImages = async (equipmentId: string): Promise<WorkOrderWithImages[]> => {
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('id')
    .eq('equipment_id', equipmentId);

  if (woError) throw woError;

  const workOrdersWithImages: WorkOrderWithImages[] = [];
  
  for (const wo of workOrders || []) {
    const { data: images, error: imgError } = await supabase
      .from('work_order_images')
      .select('id, file_url')
      .eq('work_order_id', wo.id);

    if (imgError) throw imgError;

    workOrdersWithImages.push({
      id: wo.id,
      images: images || []
    });
  }

  return workOrdersWithImages;
};

// Get PM count for work orders
const getPMCount = async (workOrderIds: string[]): Promise<number> => {
  if (workOrderIds.length === 0) return 0;

  const { count, error } = await supabase
    .from('preventative_maintenance')
    .select('*', { count: 'exact', head: true })
    .in('work_order_id', workOrderIds);

  if (error) throw error;
  return count || 0;
};

// Delete equipment note images from storage
const deleteEquipmentNoteImagesFromStorage = async (images: EquipmentNoteImage[]): Promise<void> => {
  if (images.length === 0) return;

  const filePaths = images
    .map(img => normalizeStoredObjectPath(img.file_url, 'equipment-note-images'))
    .filter((p): p is string => !!p);
  
  const results = await Promise.allSettled(
    filePaths.map(path => 
      supabase.storage
        .from('equipment-note-images')
        .remove([path])
    )
  );

  // Log any failures but don't throw
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error(`Failed to delete equipment note image ${filePaths[index]}:`, result.reason);
    }
  });
};

export const getEquipmentDeletionImpact = async (equipmentId: string): Promise<EquipmentDeletionImpact> => {
  try {
    // Count work orders
    const { count: workOrderCount, error: woCountError } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('equipment_id', equipmentId);

    if (woCountError) throw woCountError;

    // Get work order IDs for PM count
    const { data: workOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('equipment_id', equipmentId);

    if (woError) throw woError;

    const workOrderIds = workOrders?.map(wo => wo.id) || [];

    // Count PMs
    const pmCount = await getPMCount(workOrderIds);

    // Count equipment note images
    const equipmentNoteImages = await getEquipmentNoteImages(equipmentId);

    // Count work order images
    const workOrdersWithImages = await getWorkOrdersWithImages(equipmentId);
    const workOrderImageCount = workOrdersWithImages.reduce((total, wo) => total + wo.images.length, 0);

    return {
      workOrders: workOrderCount || 0,
      pmCount,
      equipmentNoteImages: equipmentNoteImages.length,
      workOrderImages: workOrderImageCount
    };
  } catch (error) {
    logger.error('Error getting equipment deletion impact:', error);
    throw error;
  }
};

export const deleteEquipmentCascade = async (equipmentId: string, orgId: string): Promise<void> => {
  try {
    const equipmentDisplayImageRef = await getEquipmentDisplayImageRef(
      orgId,
      equipmentId,
    );

    logger.info(`Starting cascade deletion for equipment ${equipmentId}`);

    // The whole database cascade (work orders and their children, note
    // images, notes, scans, equipment) runs in one server-side transaction.
    // The RPC authorizes owners/admins and team roles granted equipment.delete,
    // so this no longer depends on admin-only child-table policies.
    const { data, error } = await supabase.rpc('delete_equipment_cascade', {
      p_equipment_id: equipmentId,
    });
    if (error) throw error;

    const result = (data ?? {}) as { success?: boolean; error?: string; note_image_paths?: string[] };
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete equipment');
    }

    // Storage cleanup stays best-effort, as before.
    await deleteEquipmentNoteImagesFromStorage(
      (result.note_image_paths ?? []).map((file_url) => ({ id: '', file_url })),
    );

    if (isDisplayImageV2Ref(equipmentDisplayImageRef)) {
      try {
        await removeDisplayImageSet(equipmentDisplayImageRef);
      } catch (cleanupError) {
        logger.warn('Failed to remove deleted Equipment display image set', {
          equipmentId,
          organizationId: orgId,
          error: cleanupError,
        });
      }
    }

    logger.info(`Successfully deleted equipment ${equipmentId} and all related data`);

  } catch (error) {
    logger.error('Error in equipment cascade deletion:', error);
    throw error;
  }
};
