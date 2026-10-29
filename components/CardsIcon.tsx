/** "My cards": a little fan of three Dream Factory cards (creature, equipment, pet colors) with a star. */
export default function CardsIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="cards-icon">
      <g strokeLinejoin="round">
        <rect x="6" y="11" width="20" height="28" rx="4" transform="rotate(-16 16 25)" fill="#2ed9a3" stroke="#23205a" strokeWidth="2.5" />
        <rect x="22" y="11" width="20" height="28" rx="4" transform="rotate(16 32 25)" fill="#9b7bff" stroke="#23205a" strokeWidth="2.5" />
        <rect x="14" y="7" width="20" height="30" rx="4" fill="#ff8a3d" stroke="#23205a" strokeWidth="2.5" />
        <rect x="17.5" y="10.5" width="13" height="11" rx="2.5" fill="#fff6d6" />
        <path
          d="M24 12.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z"
          fill="#ffcf33"
          stroke="#23205a"
          strokeWidth="1.2"
        />
        <rect x="17.5" y="24.5" width="13" height="2.6" rx="1.3" fill="#fff" opacity="0.9" />
        <rect x="17.5" y="29" width="9" height="2.6" rx="1.3" fill="#fff" opacity="0.9" />
      </g>
    </svg>
  );
}
