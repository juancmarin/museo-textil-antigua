import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'backend_not_configured' });
  }

  const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from('designs')
    .select('id, grid, rows, cols, email_masked, created_at')
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    return res.status(500).json({ error: 'db_error', detail: error.message });
  }

  // 60 second CDN cache; revalidates often enough for a museum gallery
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ designs: data ?? [] });
}
