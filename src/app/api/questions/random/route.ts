import { NextRequest, NextResponse } from 'next/server';
import { getRandomQuestion, recordQuestionShown, recordTemplateShown, Level } from '@/lib/db';

const validLevels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const level = searchParams.get('level') as Level;

  if (!level || !validLevels.includes(level)) {
    return NextResponse.json(
      { error: 'Invalid level. Must be one of: L1, L2, L3, L4, L5' },
      { status: 400 }
    );
  }

  const question = getRandomQuestion(level);

  if (!question) {
    return NextResponse.json(
      { error: 'No questions found for this level' },
      { status: 404 }
    );
  }

  // Record that this question/template was shown
  if (question.type === 'simple') {
    recordQuestionShown(question.id);
  } else if (question.type === 'template' && question.templateId && question.variableUsed) {
    recordTemplateShown(question.templateId, question.variableUsed);
  }

  return NextResponse.json(question);
}
