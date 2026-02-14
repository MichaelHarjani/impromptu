import { SessionOptions } from 'iron-session';

export interface SessionData {
  userId?: number;
  username?: string;
  isLoggedIn: boolean;
  siteAccessGranted: boolean;
  emailUserId?: number;
  emailUsername?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_dev',
  cookieName: 'impromptu_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
  siteAccessGranted: false,
};
