import type { SupabaseClient } from '@supabase/supabase-js'

export async function ensureAim90Profile(
  supabase: SupabaseClient,
  userId: string
) {
  const { error } = await supabase
    .from('aim90_table')
    .upsert(
      { user_id: userId },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }
}

