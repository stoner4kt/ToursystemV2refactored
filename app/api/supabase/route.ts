import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Prefer service role key if available (which bypasses RLS), fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    const { action, tableName, data, matchColumn, matchValue } = await req.json();

    if (!supabaseAdmin) {
      console.warn('[API Supabase] Supabase client not initialized (missing environment variables).');
      return NextResponse.json({ success: false, error: 'Supabase client not initialized' }, { status: 500 });
    }

        if (action === 'push') {
      console.log(`[API Supabase] Pushing to ${tableName} with match ${matchColumn} = ${matchValue}`);
      const { error } = await (supabaseAdmin as any).from(tableName).upsert(data, { onConflict: matchColumn });
      if (error) {
        console.warn(`[API Supabase] Primary upsert failed on '${tableName}':`, error.message);
        // Fallback manual select + update/insert
        const { data: existing, error: selectError } = await (supabaseAdmin as any)
          .from(tableName)
          .select(matchColumn)
          .eq(matchColumn, matchValue)
          .maybeSingle();

        if (selectError) {
          console.error(`[API Supabase] Fallback select error on '${tableName}':`, selectError.message);
        }

        if (existing) {
          console.log(`[API Supabase] Row exists in '${tableName}', performing update.`);
          const { error: updateError } = await (supabaseAdmin as any)
            .from(tableName)
            .update(data)
            .eq(matchColumn, matchValue);
          if (updateError) {
            console.error(`[API Supabase] Fallback update failed on '${tableName}':`, updateError.message);
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
          }
        } else {
          console.log(`[API Supabase] Row does not exist in '${tableName}', performing insert.`);
          const { error: insertError } = await (supabaseAdmin as any)
            .from(tableName)
            .insert([data]);
          if (insertError) {
            console.error(`[API Supabase] Fallback insert failed on '${tableName}':`, insertError.message);
            return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      console.log(`[API Supabase] Deleting from ${tableName} where ${matchColumn} = ${matchValue}`);
      const { error } = await (supabaseAdmin as any).from(tableName).delete().eq(matchColumn, matchValue);
      if (error) {
        console.error(`[API Supabase] Delete error on '${tableName}':`, error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'sync_all') {
      console.log(`[API Supabase] Syncing all requested tables`);
      const results: Record<string, any[]> = {};
      const tablesList = data?.tables || [];
      
      for (const t of tablesList) {
        const { data: rows, error } = await (supabaseAdmin as any).from(t.name).select('*');
        if (error) {
          console.error(`[API Supabase Sync Error] Table '${t.name}':`, error.message);
        } else {
          results[t.name] = rows || [];
        }
      }
      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error(`[API Supabase Exception]:`, err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
