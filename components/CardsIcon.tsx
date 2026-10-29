/**
 * "My cards": a little fan of three Dream Factory cards (pet, equipment, creature colors) with a star.
 * Each card has the same frame look as the real cards: the kind's deep color and its faint
 * pattern (paws, sparkles, scales). The ids are shared on purpose: every copy of the icon
 * defines identical patterns, so whichever one the browser finds first is correct.
 */
export default function CardsIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="cards-icon">
      <defs>
        {/* Creature: scales */}
        <pattern id="ci-p-creature" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 2.5a2.5 2.5 0 0 1 5 0M-2.5 5a2.5 2.5 0 0 1 5 0M2.5 5a2.5 2.5 0 0 1 5 0" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.5" />
        </pattern>
        {/* Equipment: sparkles */}
        <pattern id="ci-p-equipment" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M2 0.6l0.4 1 1 0.4-1 0.4-0.4 1-0.4-1-1-0.4 1-0.4z M5.4 4l0.3 0.8 0.8 0.3-0.8 0.3-0.3 0.8-0.3-0.8-0.8-0.3 0.8-0.3z" fill="#fff" fillOpacity="0.4" />
        </pattern>
        {/* Pet: paws */}
        <pattern id="ci-p-pet" width="7" height="7" patternUnits="userSpaceOnUse">
          <g fill="#fff" fillOpacity="0.38">
            <ellipse cx="3.5" cy="4.2" rx="1.2" ry="1" />
            <circle cx="2.2" cy="2.7" r="0.45" />
            <circle cx="3" cy="2.2" r="0.45" />
            <circle cx="4" cy="2.2" r="0.45" />
            <circle cx="4.8" cy="2.7" r="0.45" />
          </g>
        </pattern>
      </defs>
      <g strokeLinejoin="round">
        <g transform="rotate(-16 16 25)">
          <rect x="6" y="11" width="20" height="28" rx="4" fill="#1bbb88" />
          <rect x="6" y="11" width="20" height="28" rx="4" fill="url(#ci-p-pet)" stroke="#23205a" strokeWidth="2.5" />
        </g>
        <g transform="rotate(16 32 25)">
          <rect x="22" y="11" width="20" height="28" rx="4" fill="#7b5af0" />
          <rect x="22" y="11" width="20" height="28" rx="4" fill="url(#ci-p-equipment)" stroke="#23205a" strokeWidth="2.5" />
        </g>
        <rect x="14" y="7" width="20" height="30" rx="4" fill="#e9682b" />
        <rect x="14" y="7" width="20" height="30" rx="4" fill="url(#ci-p-creature)" stroke="#23205a" strokeWidth="2.5" />
        <rect x="17.5" y="10.5" width="13" height="11" rx="2.5" fill="#fff6d6" stroke="#ffd76a" strokeWidth="0.8" />
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
