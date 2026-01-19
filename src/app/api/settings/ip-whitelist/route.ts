import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';
import {
  getIpWhitelist,
  setIpWhitelist,
  isIpWhitelistEnabled,
  setIpWhitelistEnabled,
} from '@/lib/db';

export async function GET() {
  try {
    // Check admin authentication
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const whitelist = getIpWhitelist();
    const enabled = isIpWhitelistEnabled();

    return NextResponse.json({ whitelist, enabled });
  } catch (error) {
    console.error('Error fetching IP whitelist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch IP whitelist' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { whitelist, enabled } = body;

    if (whitelist !== undefined) {
      if (!Array.isArray(whitelist)) {
        return NextResponse.json(
          { error: 'Whitelist must be an array' },
          { status: 400 }
        );
      }

      // Validate IP addresses
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
      for (const ip of whitelist) {
        if (typeof ip !== 'string' || !ipRegex.test(ip)) {
          return NextResponse.json(
            { error: `Invalid IP address: ${ip}` },
            { status: 400 }
          );
        }
      }

      setIpWhitelist(whitelist);
    }

    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Enabled must be a boolean' },
          { status: 400 }
        );
      }
      setIpWhitelistEnabled(enabled);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating IP whitelist:', error);
    return NextResponse.json(
      { error: 'Failed to update IP whitelist' },
      { status: 500 }
    );
  }
}
