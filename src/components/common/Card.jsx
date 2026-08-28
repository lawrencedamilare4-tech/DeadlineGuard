export function Card({ children, className = '', glow = false }) {
  return (
    <div
      className={[
        'relative rounded-2xl border border-shamrock-darker/60',
        'bg-shamrock-darkest/60 backdrop-blur-xl p-6',
        'shadow-[0_8px_30px_-4px_rgba(0,0,0,0.45)]',
        glow ? 'shadow-[0_0_40px_-10px_rgba(77,179,114,0.35)]' : '',
        className,
      ].join(' ')}
    >
      {/* faint top sheen for a glass feel */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] via-transparent to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}