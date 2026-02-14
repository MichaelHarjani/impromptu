import { getDb } from './index';
import type { Level, SiteAccessLog } from '../types';

export function recordNumberInput(number: number, level: Level, ipAddress?: string): void {
  const db = getDb();
  db.prepare('INSERT INTO number_inputs (number, level, ip_address) VALUES (?, ?, ?)').run(number, level, ipAddress || null);
}

export function getAllNumberInputs(): Array<{ id: number; number: number; level: Level; created_at: string }> {
  const db = getDb();
  return db.prepare('SELECT * FROM number_inputs ORDER BY created_at DESC').all() as Array<{ id: number; number: number; level: Level; created_at: string }>;
}

export function logSiteAccess(
  ipAddress: string,
  success: boolean,
  userAgent?: string,
  deviceInfo?: unknown,
  location?: unknown
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO site_access_logs (ip_address, user_agent, device_info, location, success)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    ipAddress,
    userAgent || null,
    deviceInfo ? JSON.stringify(deviceInfo) : null,
    location ? JSON.stringify(location) : null,
    success ? 1 : 0
  );
}

export function getSiteAccessLogs(options: {
  page?: number;
  limit?: number;
  success?: boolean;
  ip?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): { logs: SiteAccessLog[]; total: number } {
  const db = getDb();
  const page = options.page || 1;
  const limit = options.limit || 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.success !== undefined) {
    conditions.push('success = ?');
    params.push(options.success ? 1 : 0);
  }

  if (options.ip) {
    conditions.push('ip_address = ?');
    params.push(options.ip);
  }

  if (options.dateFrom) {
    conditions.push('created_at >= ?');
    params.push(options.dateFrom);
  }

  if (options.dateTo) {
    conditions.push('created_at <= ?');
    params.push(options.dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = db.prepare(`SELECT COUNT(*) as count FROM site_access_logs ${whereClause}`).get(...params) as { count: number };
  const total = totalResult.count;

  const logs = db.prepare(`
    SELECT * FROM site_access_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as SiteAccessLog[];

  return { logs, total };
}

interface DigitStats {
  digit: number;
  count: number;
}

interface LuckyNumberStats {
  topDigits: DigitStats[];
  totalCount: number;
  allNumbers: Array<{ id: number; number: number; level: string; ip_address: string | null; created_at: string }>;
}

export function getLuckyNumberStats(): LuckyNumberStats {
  const db = getDb();

  const allNumbers = db.prepare(`
    SELECT id, number, level, ip_address, created_at
    FROM number_inputs
    ORDER BY created_at DESC
  `).all() as Array<{ id: number; number: number; level: string; ip_address: string | null; created_at: string }>;

  const totalCount = allNumbers.length;

  const digitCounts = new Map<number, number>();
  allNumbers.forEach(entry => {
    const digits = String(entry.number).split('').map(d => parseInt(d, 10));
    digits.forEach(digit => {
      digitCounts.set(digit, (digitCounts.get(digit) || 0) + 1);
    });
  });

  const topDigits = Array.from(digitCounts.entries())
    .map(([digit, count]) => ({ digit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { topDigits, totalCount, allNumbers };
}
