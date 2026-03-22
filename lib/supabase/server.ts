import { createClient } from '@supabase/supabase-js';

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Lazy singleton — only created when first accessed at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = new Proxy({} as any, {
  get(_target, prop) {
    if (!_client) _client = createSupabaseClient();
    return _client[prop];
  },
});
