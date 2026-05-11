import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

export async function GET() {
  const maxNumber = getSetting('max_number') || '1000';
  const activeBank = getSetting('active_bank') || 'practice';
  const timerSettings = getSetting('timer_settings');
  const l7Name = getSetting('l7_name') || 'Special Events';
  const l7Label = getSetting('l7_label') || '⭐';
  return NextResponse.json({
    max_number: parseInt(maxNumber, 10),
    active_bank: activeBank,
    timer_settings: timerSettings ? JSON.parse(timerSettings) : null,
    l7_name: l7Name,
    l7_label: l7Label,
  });
}
