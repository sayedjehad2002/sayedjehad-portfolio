import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

// Shared CTA components. One canonical look for primary + secondary actions so the
// ~20 modal CTAs stop drifting (corner radius, press feedback, focus ring) and every
// interactive control ships a visible focus-visible ring + a >=44px touch target.
// Render as <button> by default or <a> via the *Link variants. className is merged
// (tailwind-merge) so callers can still tweak width/spacing without fighting the base.

const cx = (...parts: Parameters<typeof clsx>): string => twMerge(clsx(parts));

const BASE = 'ui-focus-panel inline-flex min-h-[44px] items-center justify-center gap-2 font-sans font-semibold outline-none';

const PRIMARY = `${BASE} rounded-xl bg-teal-deep px-5 py-3 text-body text-white shadow-[0_5px_0_#0c4a4c] transition-[transform,filter,box-shadow] duration-150 ease-smooth hover:brightness-105 active:translate-y-[2px] active:shadow-[0_3px_0_#0c4a4c]`;

const SECONDARY = `${BASE} rounded-xl border border-line bg-white px-4 py-3 text-small text-teal-deep transition-colors duration-150 ease-smooth hover:border-teal/60 hover:bg-sunken`;

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };
type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode };

export function PrimaryButton({ className, children, ...props }: BtnProps) {
  return (
    <button className={cx(PRIMARY, className)} {...props}>
      {children}
    </button>
  );
}

export function PrimaryLink({ className, children, ...props }: LinkProps) {
  return (
    <a className={cx(PRIMARY, className)} {...props}>
      {children}
    </a>
  );
}

export function SecondaryButton({ className, children, ...props }: BtnProps) {
  return (
    <button className={cx(SECONDARY, className)} {...props}>
      {children}
    </button>
  );
}

export function SecondaryLink({ className, children, ...props }: LinkProps) {
  return (
    <a className={cx(SECONDARY, className)} {...props}>
      {children}
    </a>
  );
}
