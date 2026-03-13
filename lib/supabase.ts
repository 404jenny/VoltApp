import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ysjevkwadymtnalsdush.supabase.co';
const supabaseAnonKey = 'sb_publishable_v5HXbh4BC-jBziWN5pHRvA_4dHLvP92';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});