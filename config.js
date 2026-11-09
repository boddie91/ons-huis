/* Koppeling met jullie Supabase-database (zie README, stap 2).
   Beide waarden vind je in Supabase onder Project Settings > API.
   Deze sleutel is bedoeld om openbaar te zijn: zonder de huiscode kan niemand iets lezen of wijzigen.
   Laat de velden leeg om de app in proefmodus te gebruiken (alles blijft dan op één apparaat). */
window.ONS_HUIS_CONFIG = {
  supabaseUrl: '',      // bijv. 'https://abcdefgh.supabase.co'
  supabaseAnonKey: ''   // de 'anon public' of 'publishable' sleutel
};
