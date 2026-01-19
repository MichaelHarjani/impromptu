import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getSetting, setSetting, setSitePassword, getIpWhitelist, setIpWhitelist, setIpWhitelistEnabled, isIpWhitelistEnabled } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function GET() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lockDuration = getSetting('lock_duration_minutes') || '30';
  const maxNumber = getSetting('max_number') || '1000';
  const ipWhitelist = getIpWhitelist();
  const ipWhitelistEnabled = isIpWhitelistEnabled();

  return NextResponse.json({
    lock_duration_minutes: parseInt(lockDuration, 10),
    max_number: parseInt(maxNumber, 10),
    ip_whitelist: ipWhitelist,
    ip_whitelist_enabled: ipWhitelistEnabled,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lock_duration_minutes, max_number, site_password, ip_whitelist, ip_whitelist_enabled } = body;

    if (lock_duration_minutes !== undefined) {
      const duration = parseInt(lock_duration_minutes, 10);
      if (isNaN(duration) || duration < 0 || duration > 1440) {
        return NextResponse.json(
          { error: 'Lock duration must be between 0 and 1440 minutes' },
          { status: 400 }
        );
      }
      setSetting('lock_duration_minutes', String(duration));
    }

    if (max_number !== undefined) {
      const maxNum = parseInt(max_number, 10);
      if (isNaN(maxNum) || maxNum < 1 || maxNum > 10000) {
        return NextResponse.json(
          { error: 'Max number must be between 1 and 10000' },
          { status: 400 }
        );
      }
      setSetting('max_number', String(maxNum));
    }

    if (site_password !== undefined) {
      if (typeof site_password !== 'string' || site_password.length === 0) {
        return NextResponse.json(
          { error: 'Site password cannot be empty' },
          { status: 400 }
        );
      }
      setSitePassword(site_password);
    }

    if (ip_whitelist !== undefined) {
      if (!Array.isArray(ip_whitelist) || !ip_whitelist.every(ip => typeof ip === 'string')) {
        return NextResponse.json(
          { error: 'IP whitelist must be an array of strings' },
          { status: 400 }
        );
      }
      setIpWhitelist(ip_whitelist);
    }

    if (ip_whitelist_enabled !== undefined) {
      if (typeof ip_whitelist_enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'ip_whitelist_enabled must be a boolean' },
          { status: 400 }
        );
      }
      setIpWhitelistEnabled(ip_whitelist_enabled);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
