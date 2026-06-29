export function Brand() {
  return (
    <div
      style={{ top: 'calc(1rem + env(safe-area-inset-top))', left: 'calc(1rem + env(safe-area-inset-left))' }}
      className="ui-chip fixed z-30 h-11 px-3.5"
    >
      {/* SJ monogram tile, teal accent with a soft glow */}
      <span className="grid h-6 w-6 place-items-center rounded-md bg-teal font-pixel text-micro leading-none text-[#06231f] shadow-[0_0_10px_rgba(31,168,156,0.55)]">
        SJ
      </span>
      <span className="font-sans text-small font-semibold leading-none text-white">Developer&apos;s World</span>
    </div>
  );
}
