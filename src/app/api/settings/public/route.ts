import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

export async function GET() {
  const maxNumber = getSetting('max_number') || '1000';
  return NextResponse.json({
    max_number: parseInt(maxNumber, 10),
  });
}
