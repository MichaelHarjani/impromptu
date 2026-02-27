import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getAllQuestionsWithFeedback, createQuestion, Level } from '@/lib/db';
import type { AgeGroup, QuestionBank } from '@/lib/types';
import { SessionData, sessionOptions } from '@/lib/session';

const validLevels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
const validAgeGroups: AgeGroup[] = ['5-7', '8-11', '12+'];
const validBanks: QuestionBank[] = ['practice', 'competition'];

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
  const ageGroup = searchParams.get('ageGroup') as AgeGroup | null;
  const bank = searchParams.get('bank') as QuestionBank | null;

  if (level && !validLevels.includes(level)) {
    return NextResponse.json(
      { error: 'Invalid level. Must be one of: L1, L2, L3, L4, L5' },
      { status: 400 }
    );
  }

  if (ageGroup && !validAgeGroups.includes(ageGroup)) {
    return NextResponse.json(
      { error: 'Invalid age group. Must be one of: 5-7, 8-11, 12+' },
      { status: 400 }
    );
  }

  if (bank && !validBanks.includes(bank)) {
    return NextResponse.json(
      { error: 'Invalid bank. Must be one of: practice, competition' },
      { status: 400 }
    );
  }

  const questions = getAllQuestionsWithFeedback(level || undefined, ageGroup || undefined, bank || undefined);
  return NextResponse.json(questions);
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { level, text, age_group, bank } = body;

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

    if (age_group && !validAgeGroups.includes(age_group)) {
      return NextResponse.json(
        { error: 'Invalid age group. Must be one of: 5-7, 8-11, 12+' },
        { status: 400 }
      );
    }

    if (bank && !validBanks.includes(bank)) {
      return NextResponse.json(
        { error: 'Invalid bank. Must be one of: practice, competition' },
        { status: 400 }
      );
    }

    const question = createQuestion(level, text.trim(), age_group || '8-11', bank || 'practice');
    return NextResponse.json(question, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
