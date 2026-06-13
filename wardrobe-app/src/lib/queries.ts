/** TanStack Query hooks over the active backend. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useBackend } from './session';
import type { Garment, SavedOutfit, StyleId } from './types';

export function useGarments() {
  const backend = useBackend();
  return useQuery({ queryKey: ['garments', backend.kind], queryFn: () => backend.listGarments() });
}

export function useProfile() {
  const backend = useBackend();
  return useQuery({ queryKey: ['profile', backend.kind], queryFn: () => backend.getProfile() });
}

export function useGenerationsToday() {
  const backend = useBackend();
  return useQuery({
    queryKey: ['generationsToday', backend.kind],
    queryFn: () => backend.generationsToday(),
  });
}

export function useSavedOutfits() {
  const backend = useBackend();
  return useQuery({ queryKey: ['savedOutfits', backend.kind], queryFn: () => backend.listSavedOutfits() });
}

export function useAddGarment() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (garment: Parameters<typeof backend.addGarment>[0]) => backend.addGarment(garment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garments'] }),
  });
}

export function useUpdateGarment() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Garment> }) =>
      backend.updateGarment(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garments'] }),
  });
}

export function useDeleteGarment() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.deleteGarment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garments'] }),
  });
}

export function useImportSampleWardrobe() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => backend.importSampleWardrobe(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garments'] }),
  });
}

export function useSaveOutfit() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outfit: Omit<SavedOutfit, 'id' | 'createdAt'>) => backend.saveOutfit(outfit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedOutfits'] }),
  });
}

export function useDeletedOutfits() {
  const backend = useBackend();
  return useQuery({
    queryKey: ['deletedOutfits', backend.kind],
    queryFn: () => backend.listDeletedOutfits(),
  });
}

export function useUpdateSavedOutfit() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SavedOutfit> }) =>
      backend.updateSavedOutfit(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedOutfits'] }),
  });
}

/** Soft delete → moves an outfit to the trash. */
export function useDeleteSavedOutfit() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.deleteSavedOutfit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savedOutfits'] });
      qc.invalidateQueries({ queryKey: ['deletedOutfits'] });
    },
  });
}

/** Restore a trashed outfit (clears deletedAt). */
export function useRestoreSavedOutfit() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.updateSavedOutfit(id, { deletedAt: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savedOutfits'] });
      qc.invalidateQueries({ queryKey: ['deletedOutfits'] });
    },
  });
}

/** Permanently remove a trashed outfit. */
export function usePurgeSavedOutfit() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.purgeSavedOutfit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deletedOutfits'] }),
  });
}

export function useSetPreferredStyles() {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (styles: StyleId[]) => backend.setPreferredStyles(styles),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
