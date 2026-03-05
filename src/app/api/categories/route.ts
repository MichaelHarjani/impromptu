import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getAllActivities, createActivity, bulkCreateActivities } from '@/lib/db';
import type { QuestionBank } from '@/lib/types';
import { SessionData, sessionOptions } from '@/lib/session';

const validBanks: QuestionBank[] = ['practice', 'competition'];

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bank = request.nextUrl.searchParams.get('bank') as QuestionBank | null;
  const activities = getAllActivities(bank || undefined);
  return NextResponse.json(activities);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, names, bank } = body;

    if (bank && !validBanks.includes(bank)) {
      return NextResponse.json({ error: 'Invalid bank' }, { status: 400 });
    }

    // Bulk create
    if (Array.isArray(names)) {
      const validNames = names.filter((n: string) => typeof n === 'string' && n.trim());
      if (validNames.length === 0) {
        return NextResponse.json({ error: 'At least one activity name is required' }, { status: 400 });
      }
      bulkCreateActivities(validNames, bank || 'practice');
      return NextResponse.json({ created: validNames.length }, { status: 201 });
    }

    // Single create
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Activity name is required' }, { status: 400 });
    }

    const activity = createActivity(name.trim(), bank || 'practice');
    return NextResponse.json(activity, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
