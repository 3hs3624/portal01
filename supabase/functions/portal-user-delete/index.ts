import { createDeleteHandler } from './handler.mjs';
Deno.serve(createDeleteHandler({
 url:Deno.env.get('SUPABASE_URL'),
 anonKey:Deno.env.get('SUPABASE_ANON_KEY'),
 serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
 origin:Deno.env.get('PORTAL_ORIGIN') || 'https://3hs3624.github.io',
}));
