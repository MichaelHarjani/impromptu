import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { updateTemplate, deleteTemplate } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { level, pre_text, post_text, variables } = body;

    if (!level || !['L3', 'L4'].includes(level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be L3 or L4' },
        { status: 400 }
      );
    }

    if (typeof pre_text !== 'string') {
      return NextResponse.json(
        { error: 'Pre-text is required' },
        { status: 400 }
      );
    }

    if (typeof post_text !== 'string') {
      return NextResponse.json(
        { error: 'Post-text is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(variables) || variables.length === 0) {
      return NextResponse.json(
        { error: 'At least one variable is required' },
        { status: 400 }
      );
    }

    const template = updateTemplate(templateId, level, pre_text, post_text, variables);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
  }

  const deleted = deleteTemplate(templateId);

  if (!deleted) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
