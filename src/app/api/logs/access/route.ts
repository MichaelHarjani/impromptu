import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';
import { getSiteAccessLogs } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const successFilter = searchParams.get('success');
    const ip = searchParams.get('ip');

    const options: {
      page: number;
      limit: number;
      success?: boolean;
      ip?: string;
    } = { page, limit };

    if (successFilter !== null) {
      options.success = successFilter === 'true';
    }

    if (ip) {
      options.ip = ip;
    }

    const result = getSiteAccessLogs(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching access logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access logs' },
      { status: 500 }
    );
  }
}
