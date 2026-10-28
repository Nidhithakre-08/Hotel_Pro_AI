import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { init } from './store.js';

const DEV_SECRET = 'hotelpro-dev-secret-change-me-before-deploying-1234567890';
function secret() {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 32 && !s.startsWith('replace-with')) return s;
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET (32+ chars) is required in production.');
  return DEV_SECRET;
}
export const signToken = (payload) => jwt.sign(payload, secret(), { expiresIn: '7d' });

export function adminCredentials() {
  const email = (process.env.ADMIN_EMAIL && !process.env.ADMIN_EMAIL.includes('example.com') ? process.env.ADMIN_EMAIL : 'admin@hotelpro.com').trim().toLowerCase();
  const pw = process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD.startsWith('replace-with') ? process.env.ADMIN_PASSWORD : 'Admin@12345';
  return { email, password: pw };
}
export function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export function getAuth(req) {
  const h = req.headers?.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), secret()); } catch { return null; }
}
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function requireUser(req) {
  const a = getAuth(req);
  if (!a || a.role !== 'guest') throw new HttpError(401, 'Please sign in to continue.');
  return a;
}
export function requireAdmin(req) {
  const a = getAuth(req);
  if (!a || a.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  return a;
}

export function handler(fn) {
  return async (req, res) => {
    try {
      await init();
      if (typeof req.body === 'string') { try { req.body = JSON.parse(req.body); } catch { req.body = {}; } }
      await fn(req, res);
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ message: e.message });
      console.error('API error:', e);
      return res.status(500).json({ message: 'Server error. Please try again.', detail: process.env.NODE_ENV === 'development' ? e.message : undefined });
    }
  };
}
export const methodNotAllowed = (res, allow) => { res.setHeader('Allow', allow); return res.status(405).json({ message: 'Method not allowed' }); };
export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', role: 'guest', createdAt: u.createdAt });
