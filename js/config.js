/* ============================================================
   NEON DASH CLASSROOM — BACKEND CONFIGURATION
   ============================================================
   This is the ONLY file you edit to turn on multi-device sync.

   WITHOUT a backend (default):
     Everything works on one device. The teacher shares the
     generated PUPIL LINK, which carries the class accounts, so
     pupils can log in on their own devices too.

   WITH a backend (Firebase Realtime Database - free tier):
     Teacher and pupils on different computers stay in sync live:
     class register, progress, published levels, races.

   HOW TO SWITCH IT ON
   -------------------
   1. Go to https://console.firebase.google.com
   2. Create a project (free).
   3. Build -> Realtime Database -> Create Database.
   4. Open the RULES tab, paste the rules block printed below,
      then press Publish.
   5. Open the DATA tab and copy the database URL. It ends in
      firebaseio.com or firebasedatabase.app
   6. Paste it into DATABASE_URL below and save this file.
   7. Re-upload to GitHub Pages.

   Everything else (teacher setup screen) can also configure this
   at runtime, but setting it here means it is ready for everyone
   the moment the page opens.

   SUGGESTED FIREBASE RULES (classroom use)
   ----------------------------------------
   {
     "rules": {
       "neondash": {
         "$room": { ".read": true, ".write": true }
       }
     }
   }

   NOTE ON SAFETY: these simple rules let anyone who knows the
   long random room id read that room. Use first names or
   initials only, and press DELETE CLASS DATA after the lesson.
   For stricter control, host the included Node server instead
   (server/classroom-server.mjs) which checks teacher and pupil
   codes before relaying anything.
   ============================================================ */

window.NEON_DASH_CONFIG = {

  /* Paste your Firebase Realtime Database URL between the quotes.
     Leave empty ("") to run without a backend. */
  DATABASE_URL: "",

  /* Optional fixed classroom id. Leave empty to auto-generate a
     random one per teacher device. Set it if you want the same
     room every lesson, e.g. "STMARYS-Y6-COMPUTING". */
  CLASSROOM_ID: "",

  /* Optional: a WebSocket address if your school IT hosts the
     included Node server instead of using Firebase.
     Example: "wss://neondash.yourschool.internal" */
  SERVER_URL: "",

  /* Default teacher access code for a brand new device.
     The teacher can change this in Console -> Setup. */
  DEFAULT_TEACHER_CODE: "teach123",

  /* Show the built-in self test results in the browser console. */
  RUN_SELF_TEST: true
};
