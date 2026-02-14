import bcrypt from 'bcryptjs';
import { getDb } from './index';

export function getSetting(key: string): string | null {
  const db = getDb();
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return result?.value || null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getSitePasswordHash(): string | null {
  return getSetting('site_password');
}

export function setSitePassword(plainPassword: string): void {
  const hash = bcrypt.hashSync(plainPassword, 10);
  setSetting('site_password', hash);
}

export function verifySitePassword(plainPassword: string): boolean {
  let hash = getSitePasswordHash();

  if (!hash) {
    setSitePassword('animal');
    hash = getSitePasswordHash();
  }

  if (!hash) return false;
  return bcrypt.compareSync(plainPassword, hash);
}

export function getIpWhitelist(): string[] {
  const whitelistJson = getSetting('ip_whitelist') || '[]';
  try {
    return JSON.parse(whitelistJson) as string[];
  } catch {
    return [];
  }
}

export function setIpWhitelist(ips: string[]): void {
  setSetting('ip_whitelist', JSON.stringify(ips));
}

export function isIpWhitelisted(ip: string): boolean {
  const whitelist = getIpWhitelist();
  return whitelist.includes(ip);
}

export function isIpWhitelistEnabled(): boolean {
  const enabled = getSetting('ip_whitelist_enabled');
  return enabled === 'true';
}

export function setIpWhitelistEnabled(enabled: boolean): void {
  setSetting('ip_whitelist_enabled', enabled ? 'true' : 'false');
}
