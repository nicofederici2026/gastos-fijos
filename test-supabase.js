import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env.local');
} catch (e) {
  // Ignorar si no existe el archivo local
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gdrazemzpzxkqmwsfped.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    console.log('Fetching...');
    const { data, error } = await supabase.from('gastos_fijos').select('*').limit(1);
    console.log('Result:', { data, error });
  } catch (err) {
    console.error('Caught exception:', err);
  }
}

test();
