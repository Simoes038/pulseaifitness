import { createClient } from '@supabase/supabase-js';

// ===== ENV VARS =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ===== VALIDAÇÃO =====
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não definida');
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY não definida');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não definida');
}

// ===== CLIENTES =====

// Cliente público (frontend)
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Cliente admin (backend)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ===== FUNÇÕES AUXILIARES =====

// Get (SELECT single)
export async function dbGet(table, query = {}) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .match(query)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Get All
export async function dbAll(table, query = {}) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .match(query);

  if (error) throw error;
  return data || [];
}

// Insert
export async function dbInsert(table, values) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(values)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update
export async function dbUpdate(table, values, query) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .update(values)
    .match(query)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete
export async function dbDelete(table, query) {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .match(query);

  if (error) throw error;
  return { success: true };
}

// Upsert
export async function dbUpsert(table, values, onConflict) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .upsert(values, { onConflict })
    .select()
    .single();

  if (error) throw error;
  return data;
}
console.log("ENV URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
