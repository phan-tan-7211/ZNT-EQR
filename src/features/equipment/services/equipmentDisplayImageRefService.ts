import { supabase } from '@/integrations/supabase/client';

/**
 * Reads the stored display image reference (`equipment.image_url`) of one
 * equipment record, scoped to its organization. Returns `null` when the row
 * is missing or has no image; Supabase errors are rethrown unchanged.
 */
export async function getEquipmentDisplayImageRef(
  organizationId: string,
  equipmentId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('equipment')
    .select('image_url')
    .eq('id', equipmentId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return data?.image_url ?? null;
}
