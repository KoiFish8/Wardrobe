-- Background-removed cutout image for each garment, produced by the crop-garment
-- Edge Function (Gemini detect → crop → cutout). Used to render the whiteboard
-- flat-lay thumbnail. Nullable: garments without a cutout fall back to the photo.
alter table public.garments
  add column if not exists cutout_uri text;
