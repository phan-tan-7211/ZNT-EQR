import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StructuredLocationEditorControls } from '@/components/location/StructuredLocationEditorControls';
import { StructuredLocationEditorDialogFooter } from '@/components/location/StructuredLocationEditorDialogFooter';
import { useStructuredLocationEditorState } from '@/components/location/structuredLocationEditorState';
import { useStructuredLocationEditorControlsProps } from '@/components/location/useStructuredLocationEditorControlsProps';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateTeam } from '@/features/teams/services/teamService';
import type { TeamWithMembers } from '@/features/teams/services/teamService';
import {
  buildTeamAddress,
  teamLocationToPlaceData,
} from '@/features/teams/utils/teamLocationUtils';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

type TeamLocationEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithMembers;
};

export function TeamLocationEditorDialog({
  open,
  onOpenChange,
  team,
}: TeamLocationEditorDialogProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const initialPlace = useMemo(() => teamLocationToPlaceData(team), [team]);

  const editor = useStructuredLocationEditorState({
    active: open,
    initialPlace,
    fallbackAddress: buildTeamAddress(team),
  });

  const locationControlsProps = useStructuredLocationEditorControlsProps(editor);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const updates: Record<string, unknown> = {};

      if (editor.isCleared) {
        updates.location_address = null;
        updates.location_city = null;
        updates.location_state = null;
        updates.location_country = null;
        updates.location_lat = null;
        updates.location_lng = null;
      } else if (editor.pendingPlace) {
        updates.location_address = editor.pendingPlace.street || null;
        updates.location_city = editor.pendingPlace.city || null;
        updates.location_state = editor.pendingPlace.state || null;
        updates.location_country = editor.pendingPlace.country || null;
        updates.location_lat = editor.pendingPlace.lat ?? null;
        updates.location_lng = editor.pendingPlace.lng ?? null;
      }

      await updateTeam(team.id, updates, team.organization_id);
      await queryClient.invalidateQueries({ queryKey: ['team', team.id] });
      await queryClient.invalidateQueries({ queryKey: ['teams'] });

      toast({
        title: t('teamsCards.locationSaved'),
        description: t('teamsCards.locationSavedDescription'),
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('teamsCards.locationError'),
        description: error instanceof Error ? error.message : t('teamsDetail.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [editor.isCleared, editor.pendingPlace, onOpenChange, queryClient, team.id, team.organization_id, toast, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('teamsCards.setTeamLocation')}</DialogTitle>
          <DialogDescription>
            {t('teamsCards.locationInstructions')}
          </DialogDescription>
        </DialogHeader>

        <StructuredLocationEditorControls
          {...locationControlsProps}
          locationLabel={t('teamsCards.teamAddress')}
          liveCaptureTitle={t('teamsCards.captureTitle')}
          liveCaptureConfirmLabel={t('teamsCards.useLocation')}
          isSaving={isSaving}
        />

        <StructuredLocationEditorDialogFooter
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
          canSave={editor.canSave}
          isSaving={isSaving}
          saveLabel={t('teamsCards.saveLocation')}
        />
      </DialogContent>
    </Dialog>
  );
}
