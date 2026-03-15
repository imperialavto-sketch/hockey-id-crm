/**
 * Parent user model for auth flow.
 */

export interface ParentUser {
  id: string;
  phone?: string;
  name: string;
  role: string;
  /** Set when using email/password (JWT) login. */
  email?: string;
}

export interface AuthSession {
  user: ParentUser;
  token?: string;
}
