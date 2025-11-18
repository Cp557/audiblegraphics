import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  deletePresentation,
  updatePresentationTitle
} from '@/lib/supabase/presentations';
import { deletePresentation as deleteStorageFiles } from '@/lib/supabase/storage';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: presentationId } = await context.params;
    const { title } = await request.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    await updatePresentationTitle(presentationId, user.id, title.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating presentation title:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update presentation title' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: presentationId } = await context.params;

    // Delete from database (cascade delete will handle slides)
    await deletePresentation(presentationId, user.id);

    // Delete storage files (images and audio)
    await deleteStorageFiles(user.id, presentationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting presentation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete presentation' },
      { status: 500 }
    );
  }
}
