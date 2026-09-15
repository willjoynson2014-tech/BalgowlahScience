import { ArrowLeft, GraduationCap, Target, Users, Lightbulb, ShieldCheck, ClipboardCheck, BookOpen, Hammer } from 'lucide-react';

interface TeachersProps { onExit: () => void; onOpenLab: () => void }

interface Lesson {
  n: number;
  title: string;
  focus: string;
  objective: string;
  starter: string;
  main: string[];
  plenary: string;
  vocab: string[];
  success: string;
  support: string;
  stretch: string;
}

const LESSONS: Lesson[] = [
  {
    n: 1, title: 'ANATOMY OF A DASH', focus: 'Play, observe, decompose',
    objective: 'Pupils can describe the rules (algorithm) that make the game work — inputs, physics, hazards, win/lose states.',
    starter: 'Play PULSE RIDGE for 5 minutes. Class brainstorm: "What EXACTLY happened when you died?" — collect the precise rules, not feelings.',
    main: [
      'In pairs, pupils fill a "machine sheet": inputs (tap/click/space), rules (gravity, jump height, collision), outputs (score %, death, victory).',
      'Whole class: sequence the game loop on the board — input → move → check collisions → draw → repeat. Introduce the word ALGORITHM.',
      'Discuss: what makes the first 10 seconds fun? Why is the restart instant?',
    ],
    plenary: 'Cold-call: "Tell me one rule the computer checks 60 times a second." Exit ticket: write the rule as an IF…THEN sentence.',
    vocab: ['algorithm', 'input', 'rules', 'collision', 'game loop'],
    success: 'I can list at least 4 rules as IF…THEN sentences.',
    support: 'Provide a half-filled machine sheet with sentence starters.',
    stretch: 'Ask: which numbers (variables) change the "feel"? Jump height? Speed?',
  },
  {
    n: 2, title: 'PATTERNS & RHYTHM', focus: 'Level Lab: first builds',
    objective: 'Pupils design a short level using repeating patterns with controlled gaps (spacing, measurement, fairness).',
    starter: 'Show the Level Lab. Together, place 3 spikes far apart, test it, then move them closer until it breaks. What changed?',
    main: [
      'Task: in the Lab, build a level with exactly 6 obstacles — 3 easy, 2 medium, 1 hard — with an obvious rhythm (easy-easy-hard).',
      'Test constantly. After each death, pupils must say out loud WHAT to change before touching the editor (debugging discipline).',
      'Maths link: measure gaps in cells. "Your jump covers about 5 cells — what happens at a 4-cell gap? A 6-cell gap?"',
    ],
    plenary: 'Gallery walk with tablets/screens: each pair explains their rhythm choice. Class votes on the clearest pattern.',
    vocab: ['pattern', 'spacing', 'measure', 'debug', 'fair'],
    success: 'My level has a rhythm someone else can feel, and I can describe the gaps in cells.',
    support: 'Give a "rhythm template" (a printed 120-cell track with suggested slots circled).',
    stretch: 'Challenge: build a level where the rhythm deliberately tricks the player ONCE. Is it still fair?',
  },
  {
    n: 3, title: 'TEST, DEBUG, ITERATE', focus: 'Playtesting as a method',
    objective: 'Pupils run structured playtests, record failure points as data, and improve their design iteratively.',
    starter: 'Introduce the "scientist loop": PREDICT what % a friend will reach → TEST → RECORD → CHANGE ONE THING → REPEAT.',
    main: [
      'Pairs swap share codes. Each tester gets 3 attempts; the designer stays silent and records the death % each time (data table).',
      'Find the "death hotspot". Designer changes exactly ONE thing, then retests. Repeat twice.',
      'Compare data before/after: did the hotspot move? Did the level get easier or just different?',
    ],
    plenary: 'Mini-presentations: show the data table. "Our hotspot was 38%, we moved the gap from 3 to 5 cells, and testers reached 61%."',
    vocab: ['playtest', 'data', 'iterate', 'variable', 'hotspot'],
    success: 'I have a data table with at least 2 iterations and can explain what improved.',
    support: 'Pre-printed testing tables with only 3 columns: Attempt, Died at, Why.',
    stretch: 'Graph the class death data. Where is THE class hotspot? What does the shape tell us?',
  },
  {
    n: 4, title: 'TAKING FLIGHT — SHIP ZONES', focus: 'States & systems',
    objective: 'Pupils understand state switching (cube ↔ ship gates) and design a fair flying corridor.',
    starter: 'Play NEON DIVE to the first portal. Freeze: "What just CHANGED about the rules?" (input is the same — the physics changed = a new STATE.)',
    main: [
      'In the Lab: add a Ship Gate + Cube Gate at least 8 cells apart. Test flying with an empty zone first — feel the ceiling and floor.',
      'Add hazards one at a time: floor spikes, a block to duck under, a tower to rise over. Test after EACH addition.',
      'Rule of thumb discovery: "one hard thing on screen at a time". Pupils write their own Ship Zone checklist.',
    ],
    plenary: 'Share the trickiest corridor. Discuss: is a tight tunnel "hard but fair" or "unfair"? Who decides — designer or data?',
    vocab: ['state', 'portal', 'physics', 'corridor', 'threshold'],
    success: 'My flying zone is beatable by me three times in a row (proof it is fair).',
    support: 'Partner "co-pilot" calls out "up… down…" while the pilot flies the zone.',
    stretch: 'Design a corridor that teaches a NEW flying move and then tests it (scaffolded difficulty).',
  },
  {
    n: 5, title: 'ART DIRECTION & COORDINATES', focus: 'Theme, geometry, coordinates',
    objective: 'Pupils use coordinates to describe their level precisely, and create art that communicates (not decorates).',
    starter: 'Grid maths: "The spike is at cell 41. The towers are at cells 52–53. Where will the player be when it lands?" Sketch the answer before testing.',
    main: [
      'Pupils write the "blueprint" of their level: a coordinate list of every piece (cell number + type). This is a data model — compare with how the share code does it!',
      'Geometry talk: triangles (spikes), rectangles (blocks), ellipses (gates) — why does each shape LOOK dangerous/safe?',
      'Art task: give the level a name and a one-line "story vibe" (Laser Swamp, Cloud Castle…). The layout should match the vibe.',
    ],
    plenary: 'Read-out challenge: one pupil reads ONLY their coordinate list; partner pictures it, then plays it. How close was imagination to reality?',
    vocab: ['coordinate', 'data model', 'geometry', 'theme', 'blueprint'],
    success: 'I have a written coordinate blueprint that matches my level exactly.',
    support: 'Blueprint worksheets with the grid pre-printed; pupil fills one row per piece.',
    stretch: 'Estimate, then check: what % of your 120 cells are "danger cells"? Is there a golden ratio?',
  },
  {
    n: 6, title: 'THE ARCADE SHOWCASE', focus: 'Publishing & feedback',
    objective: 'Pupils publish a finished level, gather structured peer feedback, and reflect on the whole design process.',
    starter: 'Set the quality bar together — class writes the 4 rules of a "published" level (e.g., beatable, no unfair walls, has a name, has a rhythm).',
    main: [
      'Final polish sprint (15 min): finish, self-test, name, and generate the share code.',
      'Class arcade: stations open, pupils rotate playing each other\'s levels. Feedback cards use two stars and a wish.',
      'Wall of fame: record the best completion % per level on the board (live leaderboard).',
    ],
    plenary: 'Reflection circle: "What did you learn about sequins… er, SEQUENCES?" — rules, patterns, testing, fairness, perseverance. Celebrate best designer AND best playtester (different skills!).',
    vocab: ['publish', 'feedback', 'criteria', 'leaderboard', 'reflection'],
    success: 'I published a level that meets our class criteria and responded to feedback kindly and specifically.',
    support: 'Sentence starters on feedback cards: "I loved…", "It was tricky when…", "Next time try…".',
    stretch: 'Curate a class "mega-level": stitch the best sections from 3 levels into one showcase track.',
  },
];

export function Teachers({ onExit, onOpenLab }: TeachersProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#070214]/95 backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <button
          onClick={onExit}
          className="glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold tracking-wider text-white/70 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> MENU
        </button>
        <GraduationCap className="h-5 w-5 text-gold" />
        <span className="font-display text-sm font-black tracking-widest text-white sm:text-base">
          TEACHER PACK — <span className="text-gold">YEAR 5 & 6</span>
        </span>
        <button
          onClick={onOpenLab}
          className="ml-auto flex items-center gap-2 rounded-xl border border-lime/40 bg-lime/10 px-4 py-2 font-display text-[10px] font-black tracking-[0.2em] text-lime transition-all hover:bg-lime/20 active:scale-95"
        >
          <Hammer className="h-4 w-4" /> OPEN LEVEL LAB
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {/* intro */}
          <div className="glass mb-6 rounded-3xl p-6">
            <h2 className="font-display text-xl font-black tracking-wide text-white sm:text-2xl">
              DESIGN YOUR OWN DASH
              <span className="ml-2 align-middle font-body text-[10px] font-bold tracking-[0.3em] text-neon">6-LESSON UNIT</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Pupils play a fast arcade game, pull apart its rules, then design, build, test and publish
              their own levels using the in-app <b>Level Lab</b>. By the end of the unit every child has
              engineered a real, playable, shareable game level — and can explain why it is fair.
            </p>
            <div className="mt-4 grid gap-2 text-[11px] font-semibold text-white/55 sm:grid-cols-2">
              <span className="flex gap-2"><BookOpen className="h-4 w-4 shrink-0 text-neon" /> Computing KS2: algorithms, decomposition, logical reasoning, debugging, evaluating</span>
              <span className="flex gap-2"><Target className="h-4 w-4 shrink-0 text-pulse" /> Maths KS2: coordinates, patterns, measurement, data handling, geometry</span>
              <span className="flex gap-2"><Users className="h-4 w-4 shrink-0 text-lime" /> Skills: iterative design, giving feedback, resilience, communication</span>
              <span className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-gold" /> E-safety: no accounts, no personal data; level codes are anonymous text and stay on-device</span>
            </div>
          </div>

          {/* lessons */}
          <div className="flex flex-col gap-4 pb-10">
            {LESSONS.map((l) => (
              <details key={l.n} className="glass group rounded-3xl" open={l.n === 1}>
                <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-neon to-vio font-display text-lg font-black text-[#05010f]">
                    {l.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-sm font-black tracking-wider text-white sm:text-base">{l.title}</h3>
                    <p className="text-[11px] font-semibold tracking-wider text-white/40">{l.focus}</p>
                  </div>
                  <span className="ml-auto text-white/30 transition group-open:rotate-90">▸</span>
                </summary>
                <div className="flex flex-col gap-4 px-5 pb-5">
                  <Section icon={<Target className="h-4 w-4 text-neon" />} title="OBJECTIVE">
                    <p className="text-xs leading-relaxed text-white/70">{l.objective}</p>
                  </Section>
                  <Section icon={<Lightbulb className="h-4 w-4 text-gold" />} title="STARTER (10 min)">
                    <p className="text-xs leading-relaxed text-white/70">{l.starter}</p>
                  </Section>
                  <Section title="MAIN ACTIVITIES (35–40 min)">
                    <ul className="flex flex-col gap-1.5">
                      {l.main.map((m, i) => (
                        <li key={i} className="flex gap-2 text-xs leading-relaxed text-white/70">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vio" /> {m}
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <Section title="PLENARY (10 min)">
                    <p className="text-xs leading-relaxed text-white/70">{l.plenary}</p>
                  </Section>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {l.vocab.map((v) => (
                      <span key={v} className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-neon/80">
                        {v}
                      </span>
                    ))}
                  </div>
                  <div className="grid gap-2 rounded-2xl bg-white/[0.03] p-3.5 sm:grid-cols-3">
                    <p className="text-[11px] leading-relaxed text-white/70"><b className="text-lime">Success:</b> {l.success}</p>
                    <p className="text-[11px] leading-relaxed text-white/70"><b className="text-neon">Support:</b> {l.support}</p>
                    <p className="text-[11px] leading-relaxed text-white/70"><b className="text-gold">Stretch:</b> {l.stretch}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>

          {/* assessment + safety */}
          <div className="glass mb-10 rounded-3xl p-6">
            <h3 className="flex items-center gap-2 font-display text-sm font-black tracking-widest text-white">
              <ClipboardCheck className="h-4 w-4 text-lime" /> ASSESSMENT & CLASSROOM NOTES
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-white/60">
              <li>• <b>Formative:</b> machine sheets (L1), rhythm levels + gap measurements (L2), testing data tables (L3), ship-zone checklists (L4), coordinate blueprints (L5), published level + feedback cards (L6).</li>
              <li>• <b>Summative option:</b> assess the final level & blueprint against the class criteria from Lesson 6.</li>
              <li>• <b>Timing:</b> each lesson fits ~60 minutes; the arcade showcase can expand to a full afternoon event.</li>
              <li>• <b>Access:</b> works in any browser, keyboard, mouse or touch. Mute button top-right for calm classrooms.</li>
              <li>• <b>Safeguarding:</b> everything is stored locally on the device. Share codes contain only level geometry — no names, messages or images can travel in them.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] text-white/40">
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}
