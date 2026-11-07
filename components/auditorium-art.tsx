import { useId } from 'react';

const tierEdges = [76, 160, 244, 328, 412];

/** Decorative screen-space tiers keep the interactive floor free of transforms. */
export function AuditoriumArt() {
  const id = useId();
  const floorGradient = `${id}-floor`;
  const stageGradient = `${id}-stage`;

  return <svg className="auditorium-art" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={floorGradient} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fffdfa" />
        <stop offset="1" stopColor="#eeedf7" />
      </linearGradient>
      <linearGradient id={stageGradient} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fffefa" />
        <stop offset="1" stopColor="#e8e6f2" />
      </linearGradient>
    </defs>

    <path d="M15 82Q500 218 985 82V478Q500 648 15 478Z" fill={`url(#${floorGradient})`} />
    <path d="M15 478Q500 648 985 478V490Q500 660 15 490Z" fill="#d6d5e7" />

    {tierEdges.map((top, index) => {
      const bottom = top + 66;
      return <g key={top}>
        <path d={`M28 ${bottom}Q500 ${bottom + 140} 972 ${bottom}V${bottom + 9}Q500 ${bottom + 149} 28 ${bottom + 9}Z`} fill="#c7c9dd" />
        <path d={`M28 ${top}Q500 ${top + 140} 972 ${top}V${bottom}Q500 ${bottom + 140} 28 ${bottom}Z`}
          fill={index % 2 === 0 ? '#f9f8fc' : '#efedf8'} stroke="#dedeea" strokeWidth="1.2" />
        <path d={`M30 ${top + 3}Q500 ${top + 143} 970 ${top + 3}`} fill="none" stroke="#ffffff" strokeWidth="3" />
        <path d={`M30 ${bottom - 2}Q500 ${bottom + 138} 970 ${bottom - 2}`} fill="none" stroke="#d2d3e4" strokeWidth="1.4" />
      </g>;
    })}

    <path d="M249 35Q500 101 751 35V63Q500 135 249 63Z" fill="#cfcedd" />
    <ellipse cx="500" cy="35" rx="251" ry="36" fill={`url(#${stageGradient})`} stroke="#d8d8e5" strokeWidth="1.5" />
    <path d="M267 45Q500 100 733 45" fill="none" stroke="#b6c9bf" strokeWidth="3" />
    <path d="M238 63Q259 74 291 82L278 92Q244 84 225 73Z" fill="#e1e0ec" stroke="#c9cbdc" />
    <path d="M224 75Q248 86 278 93L265 103Q233 97 212 85Z" fill="#f8f7fc" stroke="#d7d8e5" />
    <path d="M762 63Q741 74 709 82L722 92Q756 84 775 73Z" fill="#e1e0ec" stroke="#c9cbdc" />
    <path d="M776 75Q752 86 722 93L735 103Q767 97 788 85Z" fill="#f8f7fc" stroke="#d7d8e5" />
  </svg>;
}
