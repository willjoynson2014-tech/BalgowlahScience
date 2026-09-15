import { useMemo, useState } from 'react';

/**
 * The classroom edition is a self-contained HTML file so it can be downloaded
 * and shared without a build system. The workspace preview now loads that same
 * file instead of a separate implementation.
 */
export default function App() {
  const [panelOpen, setPanelOpen] = useState(false);

  const classroomUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('build', '2026-03-27-0');
    const query = `?${params.toString()}`;
    const hash = window.location.hash || '';
    return `/neon-dash-classroom.html${query}${hash}`;
  }, []);

  return (
    <div className="fixed inset-0 bg-[#05010f]">
      <iframe
        title="NEON DASH Classroom"
        src={classroomUrl}
        className="absolute inset-0 h-full w-full border-0 bg-[#05010f]"
        allow="clipboard-read; clipboard-write; fullscreen"
      />

      <div className="fixed bottom-3 right-3 z-[100] flex gap-2 font-sans">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="rounded-lg border border-fuchsia-300/40 bg-[#0b0526]/90 px-3 py-2 text-[11px] font-black tracking-wide text-fuchsia-200 shadow-xl backdrop-blur transition hover:bg-fuchsia-300/15"
        >
          MAKE PUBLIC LINK
        </button>
        <a
          href="/classroom-server.mjs"
          download="classroom-server.mjs"
          className="rounded-lg border border-amber-300/40 bg-[#0b0526]/90 px-3 py-2 text-[11px] font-bold tracking-wide text-amber-200 shadow-xl backdrop-blur transition hover:bg-amber-300/15"
        >
          SCHOOL SERVER
        </a>
        <a
          href="/neon-dash-classroom.html"
          download="neon-dash-classroom.html"
          className="rounded-lg bg-cyan-300 px-3 py-2 text-[11px] font-black tracking-wide text-[#05010f] shadow-[0_0_24px_rgba(103,232,249,0.45)] transition hover:bg-cyan-200"
        >
          DOWNLOAD HTML
        </a>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-[101] flex items-end justify-end bg-black/40 p-4 font-sans sm:items-center sm:justify-center">
          <div className="w-[min(94vw,540px)] rounded-2xl border border-cyan-300/25 bg-[#0b0526] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black tracking-widest text-cyan-200">
                GET A PUBLIC LINK
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-lg leading-none text-white/40 transition hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <ol className="flex list-decimal flex-col gap-3 pl-5 text-[13px] leading-relaxed text-white/75">
              <li>
                Tap <b className="text-cyan-200">DOWNLOAD HTML</b> to save
                <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-cyan-200">
                  neon-dash-classroom.html
                </code>
                .
              </li>
              <li>
                Rename it to{' '}
                <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-cyan-200">index.html</code>.
              </li>
              <li>
                Open{' '}
                <a
                  href="https://app.netlify.com/drop"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-cyan-300 underline decoration-dotted"
                >
                  app.netlify.com/drop
                </a>{' '}
                and drag the file in.
              </li>
              <li>
                Netlify gives you a public link. Share it with anyone — no login needed.
              </li>
            </ol>

            <p className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-[11px] leading-relaxed text-amber-100/85">
              <b>Note:</b> on a public HTTPS link, live teacher control needs{' '}
              <code className="rounded bg-black/30 px-1">wss://</code>, which the school
              server provides. Use the <b>SCHOOL SERVER</b> button for classroom control,
              or the public link for play and level design only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}