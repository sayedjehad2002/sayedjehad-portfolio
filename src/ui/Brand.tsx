export function Brand() {
  return (
    <div className="ui-chip fixed left-4 top-4 z-30 h-11 px-3.5">
      {/* SJ monogram tile, teal accent with a soft glow */}
      <span className="grid h-6 w-6 place-items-center rounded-md bg-teal font-pixel text-[10px] leading-none text-[#06231f] shadow-[0_0_10px_rgba(31,168,156,0.55)]">
        SJ
      </span>
      <span className="font-sans text-[13px] font-semibold leading-none text-white">Developer&apos;s World</span>
    </div>
  );
}
