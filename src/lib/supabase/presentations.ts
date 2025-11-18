/**
 * Database operations for presentations and slides
 * Handles CRUD operations for the presentations and slides tables
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
  created_at: string;
}

export interface Slide {
  id: string;
  presentation_id: string;
  order_index: number;
  slide_title: string;
  slide_content: string;
  speaker_notes: string;
  image_prompt: string;
  image_url: string;
  audio_url: string;
  created_at: string;
}

export interface SlideInput {
  presentation_id: string;
  order_index: number;
  slide_title: string;
  slide_content: string;
  speaker_notes: string;
  image_prompt: string;
  image_url: string;
  audio_url: string;
}

export interface PresentationWithSlides extends Presentation {
  slides: Slide[];
}

/**
 * Create a new presentation
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
 * Create a new slide
 * @param slideData - Slide data
 * @returns Created slide
 */
export async function createSlide(slideData: SlideInput): Promise<Slide> {
  const { data, error } = await supabaseAdmin
    .from('slides')
    .insert(slideData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create slide: ${error.message}`);
  }

  return data;
}

/**
 * Get a presentation with all its slides
 * @param presentationId - Presentation ID
 * @param userId - User ID (for RLS check)
 * @returns Presentation with slides
 */
export async function getPresentation(
  presentationId: string,
  userId: string
): Promise<PresentationWithSlides | null> {
  // Fetch presentation
  const { data: presentation, error: presentationError } = await supabaseAdmin
    .from('presentations')
    .select('*')
    .eq('id', presentationId)
    .eq('user_id', userId)
    .single();

  if (presentationError || !presentation) {
    return null;
  }

  // Fetch slides
  const { data: slides, error: slidesError } = await supabaseAdmin
    .from('slides')
    .select('*')
    .eq('presentation_id', presentationId)
    .order('order_index', { ascending: true });

  if (slidesError) {
    throw new Error(`Failed to fetch slides: ${slidesError.message}`);
  }

  return {
    ...presentation,
    slides: slides || [],
  };
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
 * Delete a presentation (CASCADE will delete slides automatically)
 * @param presentationId - Presentation ID
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
 * Update a presentation
 * @param presentationId - Presentation ID
 * @param userId - User ID
 * @param updates - Fields to update
 */
export async function updatePresentation(
  presentationId: string,
  userId: string,
  updates: Partial<Pick<Presentation, 'title'>>
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
