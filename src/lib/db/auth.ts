// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts?: number; lockedUntil?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    return { allowed: false, lockedUntil: attempt.lockedUntil };
  }

  if (now - attempt.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    const lockedUntil = attempt.firstAttempt + ATTEMPT_WINDOW_MS + LOCKOUT_DURATION_MS;
    attempt.lockedUntil = lockedUntil;
    return { allowed: false, lockedUntil };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempt.count - 1 };
}

export function recordLoginAttempt(ip: string, success: boolean): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (success) {
    loginAttempts.delete(ip);
    return;
  }

  if (!attempt) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    if (now - attempt.firstAttempt > ATTEMPT_WINDOW_MS) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
      attempt.count++;
    }
  }
}

export function clearRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}
