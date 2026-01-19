import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';
import {
  verifySitePassword,
  isIpWhitelistEnabled,
  isIpWhitelisted,
  logSiteAccess,
  checkRateLimit,
  recordLoginAttempt,
} from '@/lib/db';
import UAParser from 'ua-parser-js';

// Dynamically import geoip-lite to handle missing data files gracefully
let geoip: any = null;
try {
  geoip = require('geoip-lite');
} catch (error) {
  console.warn('geoip-lite not available, location tracking disabled');
}

function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP (in case of proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - in development this will be unknown
  return 'unknown';
}

function getLocationFromIp(ip: string): { city?: string; country?: string; region?: string } | null {
  // Skip geolocation for localhost/private IPs
  if (ip === 'unknown' || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null;
  }

  // Skip if geoip is not available
  if (!geoip) {
    return null;
  }

  try {
    const geo = geoip.lookup(ip);
    if (geo) {
      return {
        city: geo.city || undefined,
        country: geo.country || undefined,
        region: geo.region || undefined,
      };
    }
  } catch (error) {
    console.error('Error looking up IP geolocation:', error);
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Extract IP address
    const ipAddress = getClientIp(request);

    // Check rate limit
    const rateLimit = checkRateLimit(ipAddress);
    if (!rateLimit.allowed) {
      const lockedMinutes = rateLimit.lockedUntil
        ? Math.ceil((rateLimit.lockedUntil - Date.now()) / 60000)
        : 0;
      return NextResponse.json(
        { error: `Too many failed attempts. Please try again in ${lockedMinutes} minutes.` },
        { status: 429 }
      );
    }

    // Extract user agent
    const userAgent = request.headers.get('user-agent') || '';

    // Parse user agent for device info
    const parser = new UAParser(userAgent);
    const deviceInfo = {
      browser: parser.getBrowser(),
      os: parser.getOS(),
      device: parser.getDevice(),
    };

    // Get location from IP
    const location = getLocationFromIp(ipAddress);

    // Check IP whitelist if enabled
    const ipWhitelistEnabled = isIpWhitelistEnabled();
    const ipAllowed = isIpWhitelisted(ipAddress);

    // Verify password
    const passwordValid = verifySitePassword(password);

    // Allow access if password is correct OR if IP is whitelisted (and whitelist is enabled)
    const accessGranted = passwordValid || (ipWhitelistEnabled && ipAllowed);

    // Log the attempt
    logSiteAccess(
      ipAddress,
      accessGranted,
      userAgent,
      deviceInfo,
      location
    );

    // Record login attempt for rate limiting
    recordLoginAttempt(ipAddress, accessGranted);

    if (!accessGranted) {
      const remaining = rateLimit.remainingAttempts ?? 0;
      const message = remaining > 0
        ? `Invalid password or IP not authorized. ${remaining} attempts remaining.`
        : 'Invalid password or IP not authorized';
      return NextResponse.json(
        { error: message },
        { status: 401 }
      );
    }

    // Create session
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.siteAccessGranted = true;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Site login error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
