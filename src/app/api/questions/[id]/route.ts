import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { updateQuestion, deleteQuestion, Level } from '@/lib/db';
import type { AgeGroup, QuestionBank } from '@/lib/types';
import { SessionData, sessionOptions } from '@/lib/session';

const validLevels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
const validAgeGroups: AgeGroup[] = ['5-7', '8-11', '12+'];
const validBanks: QuestionBank[] = ['practice', 'competition'];

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const questionId = parseInt(id, 10);

  if (isNaN(questionId)) {
    return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 });
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

    const question = updateQuestion(questionId, level, text.trim(), age_group, bank);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const questionId = parseInt(id, 10);

  if (isNaN(questionId)) {
    return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 });
  }

  const deleted = deleteQuestion(questionId);

  if (!deleted) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
