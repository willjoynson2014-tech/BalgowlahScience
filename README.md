# NEON DASH — Classroom Level-Building Platform

A complete browser-based classroom platform where pupils play a
Geometry-Dash-style game, design their own levels, and teachers manage
classes, accounts, permissions and progress.

**No build step. No npm install. No server required.**
Upload the folder, switch on GitHub Pages, and it runs.

---

## 1. Put it on GitHub Pages (2 minutes)

1. Create a new GitHub repository (public).
2. Upload **every file and folder in this project, exactly as they are**
   (drag and drop them into the repo, or commit them).
3. Go to **Settings → Pages**.
4. Under *Build and deployment* choose **Deploy from a branch**.
5. Branch: **main**, folder: **/ (root)**. Press **Save**.
6. Wait about a minute, then open the URL GitHub shows you, e.g.

```
https://yourname.github.io/neon-dash/
```

That's it. The site is live.

> The included `.nojekyll` file is required — it stops GitHub stripping
> folders. Do not delete it.

---

## 2. Project structure

```
/
├── index.html                  ← the whole application
├── .nojekyll                   ← required by GitHub Pages
├── README.md
├── js/
│   └── config.js               ← backend settings (edit this one file)
├── css/
│   └── theme.css               ← optional extra styling hooks
├── assets/
│   └── icons/                  ← favicon + touch icon
└── server/
    ├── classroom-server.mjs    ← OPTIONAL local school server
    └── package.json
```

All paths are **relative**, so it works from a project sub-URL
(`/yourname.github.io/repo/`) as well as a custom domain.

---

## 3. First run

Open the site. You'll see **I AM A PUPIL** / **I AM THE TEACHER**.

**Teacher access code:** `teach123`
Change it in **Class Console → Setup**.

### Teacher quick start
1. Log in as teacher.
2. **NEW CLASS** → name it (e.g. Year 7A).
3. **FILL TO 30** → creates 30 accounts instantly.
4. **CLASS LOGIN SHEET** → printable table of every login.
5. **LEVELS** tab → build levels, then set each one
   **PRIVATE / CLASS ONLY / PUBLISHED**.

### Pupil quick start
1. Open the same website.
2. **I AM A PUPIL**.
3. Type the login from the sheet, e.g. `Alex01` + password.
4. Play, build, and everything saves to that account.

Logins are **Name + Number**: `Alex01`, `Jack02`, `Sarah03`.
No seat numbers, no share codes, no connection codes.

---

## 4. Getting pupils onto their own devices

Because GitHub Pages is static hosting, each browser starts with an empty
account book. There are two supported ways to fix that.

### Option A — Pupil Link (no setup, works immediately)
In **Console → Setup**, press **COPY PUPIL LINK**.
That link contains the class register, every login, the entry message,
the rules and all published levels. Share it privately with your class
(Google Classroom / Teams). When a pupil opens it, their login works.

> Share it privately — it contains the pupil logins.

### Option B — Live sync (Firebase, free)
Gives live teacher control, the online register, and synchronised class
races across different computers.

1. Open `js/config.js`.
2. Follow the instructions written at the top of that file.
3. Paste your Firebase Realtime Database URL into `DATABASE_URL`.
4. Re-upload. Everyone is now live.

### Option C — School network server (no cloud at all)
If your school blocks external services, run the included Node server on
the teacher laptop instead. From the project root:

```bash
npm install ws
node server/classroom-server.mjs
```

It prints a teacher hosting code, a pupil address, and keeps all traffic
inside the school network.

---

## 5. Permissions model

Enforced in the data layer (`canEdit` / `canPlay`), not by hiding buttons.
Knowing a level's internal ID grants nothing.

| Level | Who can play | Who can edit |
|---|---|---|
| Main levels | All pupils | Teacher only |
| Teacher **private** | Teacher only | Teacher only |
| Teacher **class only** | That class | Teacher only |
| Teacher **published** | All pupils | Teacher only |
| Pupil level | That pupil (teacher may view) | That pupil |
| Pupil's copy | That pupil | That pupil |

Pupils can **MAKE A COPY** of any level they can play; the copy becomes
theirs to edit and the original is never touched.

---

## 6. Saving

- Level editor autosaves every few seconds, before Test Play, before the
  menu, and on leaving — with a live `✓ Saved` indicator.
- The last **8 versions** of each level are kept; **UNDO SAVE** restores one.
- Pupil progress (levels completed, unlocked, scores, attempts) saves to
  that pupil's own account and survives logout, refresh and reopening.

---

## 7. Built-in self test

The app tests itself on load. Press **F12 → Console**:

```
NEON DASH self test ALL PASSED
PASS  class A holds 30 pupils
PASS  every username unique
PASS  wrong password rejected
PASS  progress survives reload
PASS  pupil CANNOT edit teacher level
PASS  other pupil CANNOT play private level
PASS  share bundle hides private level
PASS  autosave kept a version
...
```

It builds 2 classes, 30 pupils, teacher and pupil levels, checks
isolation and permissions, then restores your real data untouched.

---

## 8. Privacy

- No adverts, analytics or trackers.
- No pupil email addresses; logins are first name + number.
- No camera, microphone or location access.
- Data stays in the browser unless you enable Firebase or the school server.
- Use first names or initials only. Press **DELETE CLASS DATA** after a
  lesson if you used the cloud option.
