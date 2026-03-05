import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { updateActivity, deleteActivity } from '@/lib/db';
import type { QuestionBank } from '@/lib/types';
import { SessionData, sessionOptions } from '@/lib/session';

const validBanks: QuestionBank[] = ['practice', 'competition'];

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const { name, bank } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Activity name is required' }, { status: 400 });
    }

    if (bank && !validBanks.includes(bank)) {
      return NextResponse.json({ error: 'Invalid bank' }, { status: 400 });
    }

    const activity = updateActivity(parseInt(id), name.trim(), bank);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    return NextResponse.json(activity);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = deleteActivity(parseInt(id));
  if (!deleted) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
