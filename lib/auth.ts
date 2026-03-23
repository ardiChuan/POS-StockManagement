import { cookies } from 'next/headers';
import { supabase } from './supabase/server';
import type { Device, DeviceRole, DeviceSession } from '@/types';

const COOKIE_NAME = 'pos_device_token';

export async function getDeviceFromCookies(): Promise<Device | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('device_token', token)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  // Update last_seen_at in the background (don't await)
  supabase
    .from('devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {});

  return data as Device;
}

export async function getSession(): Promise<DeviceSession | null> {
  const device = await getDeviceFromCookies();
  if (!device) return null;
  return { id: device.id, name: device.name, role: device.role };
}

export function requireRole(device: Device | null, roles: DeviceRole[]): void {
  if (!device) {
    throw new AuthError('Not authenticated', 401);
  }
  if (!roles.includes(device.role)) {
    throw new AuthError('Insufficient permissions', 403);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function deviceCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    path: '/',
  };
}

export { COOKIE_NAME };
