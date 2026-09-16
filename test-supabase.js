import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gdrazemzpzxkqmwsfped.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Dummy key is fine because it won't resolve

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
