import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (session.isLoggedIn) {
    return NextResponse.json({
      isLoggedIn: true,
      user: { id: session.userId, username: session.username },
    });
  }

  return NextResponse.json({ isLoggedIn: false });
}
