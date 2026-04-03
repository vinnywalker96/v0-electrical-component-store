import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const { data } = await supabase.from('categories').select('id, name, parent_id, slug, level');
  console.log('Total:', data?.length);
  const mains = data?.filter(d => !d.parent_id);
  console.log('Mains:', mains?.map(m =>({name: m.name, id: m.id})));
  
  const subs = data?.filter(d => d.parent_id);
  console.log('Subs length:', subs?.length);
})();
