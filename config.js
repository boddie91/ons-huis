/* Koppeling met jullie Supabase-database (zie README, stap 2).
   Beide waarden vind je in Supabase onder Project Settings > API.
   Deze sleutel is bedoeld om openbaar te zijn: zonder de huiscode kan niemand iets lezen of wijzigen.
   Laat de velden leeg om de app in proefmodus te gebruiken (alles blijft dan op één apparaat). */
window.ONS_HUIS_CONFIG = {
  supabaseUrl: 'https://kimiiwxzjcmgzpgdxkjd.supabase.co',      // bijv. 'https://abcdefgh.supabase.co'
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWlpd3h6amNtZ3pwZ2R4a2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNTA0MzIsImV4cCI6MjEwOTgyNjQzMn0.TwVV1DAUVvCbGgJLkWg-pDJGpD436m8jUiXZvn-nmqw'   // de 'anon public' of 'publishable' sleutel
};
