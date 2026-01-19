import { NextRequest, NextResponse } from 'next/server';
import { getRandomQuestion, recordQuestionShown, recordTemplateShown, recordNumberInput, Level } from '@/lib/db';

const validLevels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const level = searchParams.get('level') as Level;
  const numberParam = searchParams.get('number');

  if (!level || !validLevels.includes(level)) {
    return NextResponse.json(
      { error: 'Invalid level. Must be one of: L1, L2, L3, L4, L5' },
      { status: 400 }
    );
  }

  // Record the number input if provided
  if (numberParam) {
    const number = parseInt(numberParam, 10);
    if (!isNaN(number) && number >= 0) {
      const ipAddress = getClientIp(request);
      recordNumberInput(number, level, ipAddress);
    }
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
