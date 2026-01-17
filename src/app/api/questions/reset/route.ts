import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { resetQuestionPool } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function POST() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  resetQuestionPool();
  return NextResponse.json({ success: true, message: 'Question pool has been reset' });
}
