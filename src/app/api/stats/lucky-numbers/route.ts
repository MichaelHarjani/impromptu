import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';
import { getLuckyNumberStats } from '@/lib/db';

export async function GET() {
  try {
    // Check admin authentication
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = getLuckyNumberStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching lucky number stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
