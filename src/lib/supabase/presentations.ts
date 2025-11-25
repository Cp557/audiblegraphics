/**
 * Database operations for infographics (formerly presentations)
 * Handles CRUD operations for the presentations table
 */

import { createClient } from '@supabase/supabase-js';

// Create admin client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Presentation {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  audio_url: string | null;
  speaker_notes: string | null;
  video_url: string | null;
  created_at: string;
}

export interface Slide {
  id: string;
  presentation_id: string;
  slide_number: number;
  slide_title: string;
  slide_content: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface PresentationWithSlides extends Presentation {
  slides: Slide[];
}

/**
 * Create a new presentation entry
 * @param userId - User ID
 * @param title - Presentation title
 * @returns Created presentation
 */
export async function createPresentation(
  userId: string,
  title: string
): Promise<Presentation> {
  const { data, error } = await supabaseAdmin
    .from('presentations')
    .insert({
      user_id: userId,
      title,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create presentation: ${error.message}`);
  }

  return data;
}

/**
 * Update presentation with generated assets
 * @param presentationId - Presentation ID
 * @param userId - User ID
 * @param assets - Generated assets (image, audio, notes)
 */
export async function updatePresentationAssets(
  presentationId: string,
  userId: string,
  assets: { image_url: string; audio_url: string; speaker_notes: string }
): Promise<Presentation> {
  const { data, error } = await supabaseAdmin
    .from('presentations')
    .update(assets)
    .eq('id', presentationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update presentation assets: ${error.message}`);
  }

  return data;
}

/**
 * Get a presentation
 * @param presentationId - Presentation ID
 * @param userId - User ID (for RLS check)
 * @returns Presentation
 */
export async function getPresentation(
  presentationId: string,
  userId: string
): Promise<Presentation | null> {
  const { data, error } = await supabaseAdmin
    .from('presentations')
    .select('*')
    .eq('id', presentationId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get all presentations for a user
 * @param userId - User ID
 * @returns Array of presentations
 */
export async function getUserPresentations(
  userId: string
): Promise<Presentation[]> {
  const { data, error } = await supabaseAdmin
    .from('presentations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch presentations: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete a presentation
 * @param presentationId - Presentation ID
 * @param userId - User ID (for security check)
 * @param userId - User ID (for security check)
 */
export async function deletePresentation(
  presentationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('presentations')
    .delete()
    .eq('id', presentationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete presentation: ${error.message}`);
  }
}

/**
 * Update a presentation's video URL
 * @param presentationId - Presentation ID
 * @param userId - User ID
 * @param videoUrl - Video URL from storage
 */
export async function updatePresentationVideoUrl(
  presentationId: string,
  userId: string,
  videoUrl: string
): Promise<Presentation> {
  const { data, error } = await supabaseAdmin
    .from('presentations')
    .update({ video_url: videoUrl })
    .eq('id', presentationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update presentation video URL: ${error.message}`);
  }

  return data;
}

/**
 * Update a presentation
 * @param presentationId - Presentation ID
 * @param userId - User ID
 * @param updates - Fields to update
 */
export async function updatePresentation(
  presentationId: string,
  userId: string,
  updates: Partial<Pick<Presentation, 'title' | 'video_url'>>
): Promise<Presentation> {
  const { data, error } = await supabaseAdmin
    .from('presentations')
    .update(updates)
    .eq('id', presentationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update presentation: ${error.message}`);
  }

  return data;
}

/**
 * Update a presentation's title
 * @param presentationId - Presentation ID
 * @param userId - User ID
 * @param title - New title
 */
export async function updatePresentationTitle(
  presentationId: string,
  userId: string,
  title: string
): Promise<Presentation> {
  return updatePresentation(presentationId, userId, { title });
}
