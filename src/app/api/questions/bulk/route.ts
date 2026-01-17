import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { bulkUpdateQuestionLevel, bulkDeleteQuestions, Level } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

const validLevels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids, level } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!level || !validLevels.includes(level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be one of: L1, L2, L3, L4, L5' },
        { status: 400 }
      );
    }

    const questionIds = ids.map((id: unknown) => {
      const numId = typeof id === 'number' ? id : parseInt(String(id), 10);
      if (isNaN(numId)) {
        throw new Error('Invalid question ID');
      }
      return numId;
    });

    const updatedCount = bulkUpdateQuestionLevel(questionIds, level);
    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    const questionIds = ids.map((id: unknown) => {
      const numId = typeof id === 'number' ? id : parseInt(String(id), 10);
      if (isNaN(numId)) {
        throw new Error('Invalid question ID');
      }
      return numId;
    });

    const deletedCount = bulkDeleteQuestions(questionIds);
    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request body' },
      { status: 400 }
    );
  }
}
