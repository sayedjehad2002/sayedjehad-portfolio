import { Component, type ErrorInfo, type ReactNode } from 'react';

// Last-resort safety net: if the canvas engine (or any child) throws, the visitor
// gets a friendly cream card with the contact CTAs + a reload, instead of a blank
// screen. Self-contained (hardcoded links) so it can't depend on whatever failed.
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('App error boundary caught:', error, info);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        className="fixed inset-0 z-[100] grid place-items-center p-6 text-center"
        style={{ backgroundColor: '#15100a', backgroundImage: 'radial-gradient(135% 100% at 50% 30%, #2e2218, #15100a 72%)' }}
      >
        <div className="max-w-md">
          <h1 className="font-pixel text-[22px] leading-tight text-panel [text-shadow:0_3px_0_#1c130a]">Sayed Jehad</h1>
          <p className="mt-3 font-sans text-[15px] leading-relaxed text-on-dark-soft">
            The interactive world hit a snag on this device. No problem, you can still reach me and grab my CV:
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a href="source/sayed-jehad-cv.pdf" download className="rounded-xl bg-teal px-5 py-3 font-sans text-[14px] font-semibold text-[#08231f] shadow-[0_5px_0_#14756c]">
              Download CV
            </a>
            <a href="mailto:lumofybh@gmail.com" className="rounded-xl border border-teal/40 bg-teal/10 px-5 py-3 font-sans text-[14px] font-semibold text-on-dark-soft">
              Email
            </a>
            <a href="https://linkedin.com/in/sayed-jehad-saeed-1729b3150" target="_blank" rel="noreferrer" className="rounded-xl border border-teal/40 bg-teal/10 px-5 py-3 font-sans text-[14px] font-semibold text-on-dark-soft">
              LinkedIn
            </a>
          </div>
          <button onClick={() => window.location.reload()} className="mt-5 font-sans text-[13px] text-on-dark-faint underline underline-offset-2">
            Reload the world
          </button>
        </div>
      </div>
    );
  }
}
