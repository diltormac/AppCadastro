const supabaseUrl = "https://kiiswukzwwoznkgjyaod.supabase.co";
const supabaseKey = "sb_publishable_WPRvraB-40Fz1RuKbd5bRg_3tGvyAxg";

// Em módulos ES (strict mode), o global 'supabase' do CDN NÃO é acessível
// como bareword — precisamos acessá-lo explicitamente via window/globalThis.
const { createClient } = window.supabase;
export const supabaseClient = createClient(supabaseUrl, supabaseKey);
