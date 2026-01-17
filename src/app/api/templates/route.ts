import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getAllTemplates, createTemplate } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const level = searchParams.get('level') as 'L3' | 'L4' | null;

  if (level && !['L3', 'L4'].includes(level)) {
    return NextResponse.json(
      { error: 'Invalid level. Must be L3 or L4' },
      { status: 400 }
    );
  }

  const templates = getAllTemplates(level || undefined);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const template = createTemplate(level, pre_text, post_text, variables);
    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
