import { EDUCATION, LINKEDIN, PHASES } from '../data/roles';
import { CONTACT } from '../data/about';
import type { PhaseKey } from '../theme/palette';

const DOT: Record<PhaseKey, string> = { sales: 'bg-sales', hr: 'bg-hr', aidev: 'bg-aidev' };
const BORDER: Record<PhaseKey, string> = { sales: 'border-sales/35', hr: 'border-hr/35', aidev: 'border-aidev/35' };
const TEXT: Record<PhaseKey, string> = { sales: 'text-sales-deep', hr: 'text-hr-deep', aidev: 'text-aidev-deep' };
const TINT: Record<PhaseKey, string> = {
  sales: 'bg-sales-tint text-sales-deep',
  hr: 'bg-hr-tint text-hr-deep',
  aidev: 'bg-aidev-tint text-aidev-deep',
};

// Flatten every role into one chronological CV timeline (oldest -> newest),
// each tagged with its phase for colour. The journey reads top to bottom.
const ROLES = PHASES.flatMap((p) => p.roles.map((r) => ({ ...r, phase: p.key, phaseLabel: p.label })));

type FlatRole = (typeof ROLES)[number];

// Group consecutive same-company roles into one section so each company shows
// once as a header, with its roles nested as a step-by-step climb beneath.
interface CompanyGroup {
  company: string;
  roles: FlatRole[];
  span: string;
  headPhase: PhaseKey;
  current: boolean;
}

const GROUPS: CompanyGroup[] = ROLES.reduce<CompanyGroup[]>((acc, r) => {
  const last = acc[acc.length - 1];
  if (last && last.company === r.company) {
    last.roles.push(r);
  } else {
    acc.push({ company: r.company, roles: [r], span: '', headPhase: r.phase, current: false });
  }
  return acc;
}, []);

// Derive each company's overall span from its first start to its last end,
// plus whether the company holds the current role (drives the header NOW badge).
for (const g of GROUPS) {
  const first = g.roles[0].dates.split('–')[0].trim();
  const lastDates = g.roles[g.roles.length - 1].dates.split('–');
  const end = (lastDates[1] ?? lastDates[0]).trim();
  g.span = first === end ? first : `${first} – ${end}`;
  g.current = g.roles.some((r) => r.current);
}

// One letter per company keeps the header node compact while staying readable.
const INITIAL: Record<string, string> = { Takhlees: 'T', 'Vamonos Hygiene Services': 'V', Lumofy: 'L' };

// The climb reads top to bottom, so the connector points DOWN to the next role.
// A filled colour chip holds the arrow so it reads as a deliberate step, not a stray glyph.
function PromoteStep({ phase }: { phase: PhaseKey }) {
  return (
    <div className="flex items-center gap-2 py-2 pl-0.5" aria-hidden="true">
      <span className={`grid h-[22px] w-[22px] place-items-center rounded-full text-white shadow-chip ${DOT[phase]}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </span>
      <span className={`rounded-full px-2 py-[3px] font-pixel text-[8px] uppercase tracking-[0.16em] ${TINT[phase]}`}>
        Promoted to
      </span>
    </div>
  );
}

function RoleBlock({ r, step, total }: { r: FlatRole; step: number; total: number }) {
  const showStep = total > 1;
  return (
    <div className={`rounded-xl border bg-white/70 p-3 transition-colors duration-150 hover:border-teal/50 hover:bg-white ${BORDER[r.phase]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {showStep && (
              <span
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full font-pixel text-[9px] font-bold text-white ${DOT[r.phase]}`}
                aria-label={`Step ${step} of ${total}`}
              >
                {step}
              </span>
            )}
            <div className="font-sans text-[15px] font-bold leading-tight text-ink">{r.title}</div>
          </div>
          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 font-sans text-[9.5px] font-semibold uppercase tracking-wide ${TINT[r.phase]}`}>
            {r.phaseLabel}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-sans text-[11.5px] text-ink-faint">{r.dates}</div>
          {r.current && (
            <span className={`mt-1 inline-block rounded px-1.5 py-0.5 font-pixel text-[8px] text-white ${DOT[r.phase]}`}>NOW</span>
          )}
        </div>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {r.points.map((pt, idx) => (
          <li key={idx} className="relative pl-4 font-sans text-[12.5px] leading-snug text-ink-soft">
            <span className={`absolute left-0 top-[6px] h-1.5 w-1.5 rotate-45 ${DOT[r.phase]}`} aria-hidden="true" />
            {pt}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResumeDossier() {
  const cvHref = import.meta.env.BASE_URL + CONTACT.cv;
  return (
    <div>
      <span className="font-pixel text-[9px] uppercase tracking-widest text-teal-deep">Career path</span>
      <h2 id="modal-title" className="mb-1 mt-2 font-sans text-[24px] font-bold text-ink">
        From sales into AI development
      </h2>
      <p className="mb-5 font-sans text-[13px] text-ink-soft">Three companies, six roles, one climb from sales into AI development.</p>

      <ol className="relative ml-2 max-h-[58vh] overflow-y-auto border-l-2 border-line pl-6 pr-1">
        {GROUPS.map((g, gi) => {
          const multi = g.roles.length > 1;
          return (
            <li
              key={g.company}
              className="anim-slideup relative mb-5 last:mb-1"
              style={{ animationDelay: `${gi * 70}ms` }}
            >
              {/* company node on the spine */}
              <span
                className={`absolute -left-[27px] top-0 grid h-6 w-6 place-items-center rounded-full border-2 border-panel font-pixel text-[10px] font-bold text-white ${DOT[g.headPhase]}`}
                aria-hidden="true"
              >
                {INITIAL[g.company] ?? g.company.charAt(0)}
              </span>

              {/* company header: name, span, role count, NOW if current */}
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-sans text-[17px] font-bold leading-tight text-ink">{g.company}</div>
                  {multi && (
                    <div className="font-sans text-[11px] text-ink-faint">
                      {g.roles.length} roles · a {g.roles.length}-step climb
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-sans text-[11.5px] text-ink-faint">{g.span}</span>
                  {g.current && (
                    <span className={`inline-block rounded px-1.5 py-0.5 font-pixel text-[8px] text-white ${DOT[g.headPhase]}`}>NOW</span>
                  )}
                </div>
              </div>

              {/* roles nested as a progression */}
              <div className="flex flex-col">
                {g.roles.map((r, ri) => (
                  <div key={r.company + r.title}>
                    {ri > 0 && <PromoteStep phase={r.phase} />}
                    <RoleBlock r={r} step={ri + 1} total={g.roles.length} />
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <span className="font-sans text-[12px] text-ink-faint">{EDUCATION}</span>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-focus-panel inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 font-sans text-[13px] font-semibold text-teal-deep transition-colors duration-150 hover:border-teal/60 hover:bg-sunken"
          >
            LinkedIn
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
          <a
            href={cvHref}
            download="Sayed-Jehad-CV.pdf"
            className="ui-focus-panel inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-deep px-4 font-sans text-[13px] font-bold text-white shadow-chip transition-colors duration-150 hover:bg-teal"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
            </svg>
            Download CV
          </a>
        </div>
      </div>
    </div>
  );
}
