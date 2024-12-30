import { createClient } from '@supabase/supabase-js';
import { PRIVATE_SUPABASE_URL, PRIVATE_SUPABASE_ANON_KEY } from '$env/static/private';

const supabase = createClient(PRIVATE_SUPABASE_URL, PRIVATE_SUPABASE_ANON_KEY);

export default supabase;
