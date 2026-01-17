import { NextRequest, NextResponse } from 'next/server';
import { addFeedback } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, templateId, variableUsed, vote } = body;

    if (!vote || !['up', 'down'].includes(vote)) {
      return NextResponse.json(
        { error: 'Vote must be "up" or "down"' },
        { status: 400 }
      );
    }

    // Either questionId or (templateId + variableUsed) must be provided
    if (!questionId && !templateId) {
      return NextResponse.json(
        { error: 'Either questionId or templateId is required' },
        { status: 400 }
      );
    }

    addFeedback(questionId || null, vote, templateId, variableUsed);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
