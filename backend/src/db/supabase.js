import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Supabase client — uses service_role key for full backend access (bypasses RLS)
 */
const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Supabase anon client — for operations that should respect RLS
 */
const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "relation does not exist" — schema not migrated yet
      if (error.code === '42P01') {
        logger.warn('Database tables not found — run schema.sql migration first');
        return false;
      }
      throw error;
    }
    logger.info('Supabase connected successfully');
    return true;
  } catch (err) {
    logger.error(`Supabase connection failed: ${err.message}`);
    return false;
  }
}

export { supabase, supabaseAnon };
export default supabase;
