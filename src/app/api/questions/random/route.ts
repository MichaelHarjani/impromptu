import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';
import { getRandomQuestion, recordQuestionShown, recordTemplateShown, recordNumberInput, recordUserActivity, Level } from '@/lib/db';
import type { AgeGroup, QuestionBank } from '@/lib/types';
import { rateLimit } from '@/lib/rate-limit';

const validLevels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
const validAgeGroups: AgeGroup[] = ['5-7', '8-11', '12+'];
const validBanks: QuestionBank[] = ['practice', 'competition'];

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
  const ip = getClientIp(request);
  const { success } = rateLimit(`random:${ip}`, 60, 60_000);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const level = searchParams.get('level') as Level | null;
  const numberParam = searchParams.get('number');
  const ageGroup = searchParams.get('ageGroup') as AgeGroup | null;
  const bank = (searchParams.get('bank') as QuestionBank) || 'practice';

  if (!validBanks.includes(bank)) {
    return NextResponse.json(
      { error: 'Invalid bank. Must be one of: practice, competition' },
      { status: 400 }
    );
  }

  // Practice mode requires a level, competition mode requires an age group
  if (bank === 'practice') {
    if (!level || !validLevels.includes(level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be one of: L1, L2, L3, L4, L5' },
        { status: 400 }
      );
    }
  } else {
    if (!ageGroup || !validAgeGroups.includes(ageGroup)) {
      return NextResponse.json(
        { error: 'Invalid age group. Must be one of: 5-7, 8-11, 12+' },
        { status: 400 }
      );
    }
  }

  // Record the number input if provided
  if (numberParam) {
    const number = parseInt(numberParam, 10);
    if (!isNaN(number) && number >= 0) {
      const ipAddress = getClientIp(request);
      recordNumberInput(number, level || 'L1', ipAddress);
    }
  }

  const question = getRandomQuestion(level || undefined, ageGroup || undefined, bank);

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

  // Record user activity if logged in (skip synthesized activity questions: no stable id to track)
  if (question.type !== 'activity') {
    try {
      const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
      if (session.emailUserId) {
        recordUserActivity(
          session.emailUserId,
          question.type,
          question.type === 'simple' ? question.id : null,
          question.templateId || null,
          question.variableUsed || null,
          level || 'L1'
        );
      }
    } catch {
      // Don't fail the request if activity tracking fails
    }
  }

  return NextResponse.json(question);
}
