# NEON DASH: School Deployment

The recommended classroom setup gives every pupil a normal browser link. No
files, browser extensions, accounts, or software are installed on pupil
computers.

## Option A: School Network

Use this when pupil devices and the teacher laptop are on the same network.

1. Download `public/neon-dash-classroom.html` and
   `public/classroom-server.mjs` into the same folder on the teacher computer.
2. Install Node.js on the teacher computer.
3. Open a terminal in that folder.
4. Run `npm install ws` once.
5. Run `node classroom-server.mjs`.
6. The terminal prints an address such as `http://192.168.1.24:8080`.
7. Open that address on every school computer.
8. The teacher chooses **I AM THE TEACHER**. Pupils enter a name and seat.

The teacher console connects automatically. Keep the terminal open.

## Option B: Public HTTPS Link

Use this when the school network blocks pupil-to-teacher local connections.

1. Put this project in a GitHub repository.
2. Create a free Render account and choose **New > Blueprint**.
3. Select the repository. Render detects `render.yaml`.
4. Deploy. Render supplies a public `https://...onrender.com` address.
5. Share that one address with the class.

The same public URL serves the game and secure live teacher control. Students
do not need the relay address because the page connects to its own server.

## IT Whitelist

Ask school IT to allow:

- Your final HTTPS hostname
- WebSocket traffic (`wss://`) to the same hostname
- JavaScript, Canvas, and browser local storage for that hostname

No third-party trackers, adverts, pupil accounts, microphones, cameras, or
location access are used.