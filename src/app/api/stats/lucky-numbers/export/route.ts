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

    // Create CSV content
    const headers = ['ID', 'Number', 'Level', 'IP Address', 'Created At'];
    const rows = stats.allNumbers.map(entry => [
      entry.id,
      entry.number,
      entry.level,
      entry.ip_address || 'N/A',
      entry.created_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="lucky-numbers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting lucky numbers:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
