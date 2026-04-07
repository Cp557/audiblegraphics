import { NextRequest, NextResponse } from 'next/server';
import { deletePresentation, updatePresentationTitle } from '@/lib/local/presentations';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { title } = await request.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const newId = await updatePresentationTitle(id, title.trim());
    return NextResponse.json({ success: true, newId });
  } catch (error) {
    console.error('Error updating presentation title:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update presentation title' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deletePresentation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting presentation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete presentation' },
      { status: 500 }
    );
  }
}
