/** Logo : une porte (le cadre) et la fleche qui y entre, couleur framboise. */
export function AccessMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <path d="M10 3.75h7.25v14.5H10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
      <path d="M2.5 11h9.5M8.5 7.25 12.25 11 8.5 14.75" fill="none" stroke="var(--color-access)" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}
