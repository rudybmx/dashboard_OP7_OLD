import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function check() {
  const { data, error } = await supabase.rpc('get_managerial_data', {
    p_start_date: '2024-01-01',
    p_end_date: '2026-12-31',
    p_user_email: 'rudybmx@gmail.com'
  });
  console.log('Error:', error);
  if (data && data.length > 0) {
    console.log('Keys:', Object.keys(data[0]));
    console.log('First row:', data[0]);
  } else {
    console.log('No data', data);
  }
}

check();
