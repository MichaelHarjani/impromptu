import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getAllQuestionsWithFeedback, createQuestion, Level } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

const validLevels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const level = searchParams.get('level') as Level | null;

  if (level && !validLevels.includes(level)) {
    return NextResponse.json(
      { error: 'Invalid level. Must be one of: L1, L2, L3, L4, L5' },
      { status: 400 }
    );
  }

  const questions = getAllQuestionsWithFeedback(level || undefined);
  return NextResponse.json(questions);
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { level, text } = body;

    if (!level || !validLevels.includes(level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be one of: L1, L2, L3, L4, L5' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question text is required' },
        { status: 400 }
      );
    }

    const question = createQuestion(level, text.trim());
    return NextResponse.json(question, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
