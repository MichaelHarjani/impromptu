import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';
import { getSiteAccessLogs } from '@/lib/db';

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const success = searchParams.get('success');
    const ip = searchParams.get('ip') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const options: Parameters<typeof getSiteAccessLogs>[0] = {
      page,
      limit,
      ip,
      dateFrom,
      dateTo,
    };

    if (success !== null) {
      options.success = success === 'true';
    }

    const result = getSiteAccessLogs(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
