import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getAllCategories, createCategory } from '@/lib/db';
import type { QuestionBank } from '@/lib/types';
import { SessionData, sessionOptions } from '@/lib/session';

const validBanks: QuestionBank[] = ['practice', 'competition'];

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bank = request.nextUrl.searchParams.get('bank') as QuestionBank | null;
  const categories = getAllCategories(bank || undefined);
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, questions, bank } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.length !== 4) {
      return NextResponse.json({ error: 'Exactly 4 questions are required' }, { status: 400 });
    }

    if (bank && !validBanks.includes(bank)) {
      return NextResponse.json({ error: 'Invalid bank' }, { status: 400 });
    }

    const category = createCategory(name.trim(), questions, bank || 'practice');
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
