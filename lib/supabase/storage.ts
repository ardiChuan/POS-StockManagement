import { supabase } from './server';

export async function uploadFishPhoto(
  file: Buffer,
  contentType: string,
  fishId: string,
): Promise<string> {
  const ext = contentType.split('/')[1] || 'jpg';
  const path = `${fishId}.${ext}`;

  const { error } = await supabase.storage
    .from('fish-photos')
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from('fish-photos').getPublicUrl(path);
  return data.publicUrl;
}
