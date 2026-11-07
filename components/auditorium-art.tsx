import { useId } from 'react';
import { AUDITORIUM_SCREEN } from '../lib/auditorium';

const floorShape = 'M169 205H831L1000 406V600H0V406Z';
const screenX = AUDITORIUM_SCREEN.left * 1000;
const screenY = AUDITORIUM_SCREEN.top * 600;
const screenWidth = AUDITORIUM_SCREEN.width * 1000;
const screenHeight = AUDITORIUM_SCREEN.height * 600;
const floorSeams = [229, 247, 268, 292, 320, 353, 390, 434, 485, 545];
const shelfBooks = [0, 1, 2, 3, 4, 5];
const bookColors = ['#9ab8ce', '#d6ad81', '#c3988e', '#9bab96', '#b3a0bc'];

function PottedPlant({ x, y, scale = 1, flowers = false }: { x: number; y: number; scale?: number; flowers?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cy="2" rx="16" ry="3" fill="#8e604f" opacity=".24"/>
    <path d="M-12 -17H12L9 0H-9Z" fill="#f0e3cd" stroke="#c3a68a"/>
    <rect x="-13" y="-18" width="26" height="4" rx="2" fill="#fff3db"/>
    <path d="M1-19Q-2-29-10-34M1-19Q6-26 10-38M1-19Q4-30 2-42" fill="none" stroke="#66845c" strokeWidth="1.5"/>
    <path d="M0-22Q-18-17-18-29Q-9-32 0-22ZM-3-25Q-16-26-15-36Q-7-40-3-25Z" fill="#729564"/>
    <path d="M1-24Q5-42 14-37Q18-28 1-24ZM2-22Q16-36 19-27Q14-18 2-22Z" fill="#92ad69"/>
    <path d="M2-27Q-7-37 1-45Q12-42 2-27Z" fill="#8eb06d"/>
    {flowers && [[-12,-36], [-5,-45], [7,-41], [15,-34], [1,-33]].map(([flowerX, flowerY]) =>
      <g key={flowerX} transform={`translate(${flowerX} ${flowerY})`}>
        <path d="M0-2C-6-9-9-1-4 0C-10 4-2 8 0 3C4 8 9 2 4 0C9-4 4-8 1-3Z" fill="#fff5df"/>
        <circle r="2" fill="#dfa957"/>
      </g>
    )}
  </g>;
}

/** The decorative room shares screen-space coordinates with the interactive overlays. */
export function AuditoriumArt() {
  const id = useId();
  const maple = `${id}-maple`;
  const window = `${id}-window`;
  const stage = `${id}-stage`;
  const timber = `${id}-timber`;
  const grain = `${id}-grain`;
  const linen = `${id}-linen`;
  const floorClip = `${id}-floor`;
  const sideWall = <g>
    <path d="M0 0L169 44V206L0 410Z" fill="#c3d5eb"/>
    <path d="M0 345L169 179V206L0 410Z" fill="#88a7cf"/>
    <path d="M24 325V381M50 301V350M79 273V315M105 246V284M130 220V255M151 199V229" stroke="#6f93c1" strokeWidth="1.4"/>
    <path d="M0 346L169 179" fill="none" stroke="#f4f5f9" strokeWidth="5"/>
    <path d="M15 21L147 61V202L15 345Z" fill="#bd906a" stroke="#f2debf" strokeWidth="7"/>
    <path d="M23 34L140 67V197L23 329Z" fill={`url(#${window})`}/>
    <path d="M23 211Q54 159 79 170Q108 129 140 139V197L23 329Z" fill="#a1c0a1"/>
    <path d="M23 241Q52 196 79 201Q102 156 140 162V197L23 329Z" fill="#8eb287"/>
    <path d="M23 282Q49 229 75 219Q104 190 140 180V197L23 329Z" fill="#aac78d"/>
    <path d="M34 92Q49 69 62 87Q77 80 89 97Q60 101 34 92ZM90 108Q103 95 113 108Q126 102 133 118Q108 119 90 108Z" fill="#f4fcf3" opacity=".8"/>
    <path d="M61 45V285M103 56V237M19 137L143 110M19 234L143 155"
      fill="none" stroke="#a37960" strokeWidth="5.5"/>
    <path d="M62 46V284M104 57V236M20 135L143 109M19 232L143 154"
      fill="none" stroke="#f4dfc7" strokeWidth="1.2"/>
    <path d="M22 25Q31 83 22 168Q16 195 17 224L22 331L0 353V17Z" fill={`url(#${linen})`}/>
    <path d="M10 25Q19 101 12 177L9 340M4 24Q9 119 7 181L3 341" fill="none" stroke="#dcc6ab" strokeWidth="2.2" opacity=".71"/>
    <path d="M0 180Q11 183 20 177L20 184Q9 189 0 188Z" fill="#bc9167"/>
    <path d="M137 57L160 63L159 215L145 226Q150 183 147 146Q145 92 137 57Z" fill={`url(#${linen})`}/>
    <path d="M145 62Q155 119 153 150L152 218M151 62Q158 115 156 150L157 215" fill="none" stroke="#dac5a9" strokeWidth="1.4"/>
    <path d="M147 144L160 141V146L147 150Z" fill="#bf9369"/>
  </g>;
  const sunPatches = <g fill="#fff2c7" opacity=".56">
    {Array.from({ length: 4 }, (_, row) => Array.from({ length: 3 }, (_, column) => {
      const x = 31 + row * 15 + column * 42;
      const y = 320 + row * 58 - column * 24;
      return <path key={`${row}-${column}`} d={`M${x} ${y}l34-21 72 34-41 25Z`}/>;
    }))}
  </g>;

  return <svg className="auditorium-art" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={maple} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#d5a77d"/>
        <stop offset=".52" stopColor="#edc39b"/>
        <stop offset="1" stopColor="#f3d2ac"/>
      </linearGradient>
      <linearGradient id={window} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#9ecbe8"/>
        <stop offset="1" stopColor="#edf6f2"/>
      </linearGradient>
      <linearGradient id={stage} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#bd8c70"/><stop offset="1" stopColor="#e7b98b"/>
      </linearGradient>
      <linearGradient id={timber} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#dbad84"/><stop offset=".55" stopColor="#a16b50"/><stop offset="1" stopColor="#825740"/>
      </linearGradient>
      <linearGradient id={linen} x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#ead6b8"/><stop offset=".45" stopColor="#fff6e3"/><stop offset="1" stopColor="#f1dec3"/>
      </linearGradient>
      <pattern id={grain} width="117" height="21" patternUnits="userSpaceOnUse">
        <path d="M-7 4C25-3 46 11 80 5L125 3M-7 13Q18 8 47 14T123 15M18 19Q32 15 66 19" fill="none" stroke="#8e6049" strokeWidth=".65"/>
      </pattern>
      <clipPath id={floorClip}><path d={floorShape}/></clipPath>
    </defs>

    <rect width="1000" height="600" fill="#dce7f4"/>
    <path d="M0 0H1000L831 44H169Z" fill="#f4f4f3"/>
    <path d="M169 44H831V206H169Z" fill="#e6edf7"/>
    <path d="M169 160H831V205H169Z" fill="#9fb9db"/>
    <path d="M169 159H831" fill="none" stroke="#f4f5f9" strokeWidth="5"/>
    {sideWall}
    <g transform="translate(1000 0) scale(-1 1)">{sideWall}</g>

    <path d={floorShape} fill={`url(#${maple})`}/>
    <g clipPath={`url(#${floorClip})`}>
      <rect x="0" y="204" width="1000" height="396" fill={`url(#${grain})`} opacity=".22"/>
      {floorSeams.map((y, index) => <g key={y} fill="none" stroke="#a97658" strokeWidth="1" opacity=".29">
        <path d={`M0 ${y}H1000`}/>
        {Array.from({length: 10}, (_, plank) => {
          const start = 40 + plank * 104 + (index % 2 ? 53 : 0);
          const end = 500 + (start - 500) * 1.045;
          return <path key={plank} d={`M${start} ${y}L${end} ${floorSeams[index + 1] ?? 600}`}/>;
        })}
      </g>)}
      {sunPatches}<g transform="translate(1000 0) scale(-1 1)">{sunPatches}</g>
    </g>

    <path d="M166 177H834L873 210H127Z" fill={`url(#${stage})`} stroke="#a77659" strokeWidth="2"/>
    <path d="M166 177H834L873 210H127Z" fill={`url(#${grain})`} opacity=".31"/>
    <path d="M150 192H851M139 201H861M230 177L213 210M388 177L381 210M604 177L610 210M756 177L772 210"
      fill="none" stroke="#986c54" strokeWidth=".8" opacity=".53"/>
    <path d="M127 210H873V222H127Z" fill={`url(#${timber})`}/>
    <path d="M116 223H884V230H116Z" fill="#ebc09a"/>
    <path d="M116 230H884V239H116Z" fill="#a4775e"/>
    <path d="M127 212H873M116 225H884" stroke="#ffe0ad" strokeWidth="1.5" opacity=".85"/>
    <rect x={screenX - 10} y={screenY - 7} width={screenWidth + 20} height={screenHeight + 17}
      rx="5" fill="#5d4b45" opacity=".21"/>
    <rect x={screenX - 9} y={screenY - 8} width={screenWidth + 18} height={screenHeight + 16}
      rx="5" fill={`url(#${timber})`} stroke="#c7976c" strokeWidth="2.5"/>
    <rect x={screenX - 6} y={screenY - 5} width={screenWidth + 12} height={screenHeight + 10}
      fill="none" stroke="#e3b889" strokeWidth="1.5" opacity=".72"/>
    <rect x={screenX} y={screenY} width={screenWidth} height={screenHeight} fill="#234e43"/>
    <path d={`M${screenX - 11} ${screenY + screenHeight + 8}H${screenX + screenWidth + 11}`}
      fill="none" stroke="#8f5e43" strokeWidth="5"/>
    <path d={`M${screenX - 11} ${screenY + screenHeight + 6}H${screenX + screenWidth + 11}`}
      fill="none" stroke="#d0a17a" strokeWidth="2"/>
    <rect x={screenX + 77} y={screenY + screenHeight + 1} width="19" height="5" rx="1.5" fill="#d6a258"/>
    <rect x={screenX + 102} y={screenY + screenHeight + 4} width="11" height="2.5" rx="1" fill="#aabfe4"/>
    <rect x={screenX + screenWidth - 122} y={screenY + screenHeight + 3} width="12" height="3" rx="1" fill="#f4efe6"/>
    <rect x={screenX + screenWidth - 106} y={screenY + screenHeight + 4} width="9" height="2.5" rx="1" fill="#e2cb83"/>

    {[172, 786].map(x => <g key={x} transform={`translate(${x} 0)`}>
      <rect x="1" y="85" width="41" height="104" rx="2" fill={`url(#${timber})`} stroke="#996e53"/>
      <rect x="6" y="92" width="31" height="89" fill="#895e49"/>
      {[100, 123, 146].map((y, shelf) => <g key={y}>
        {shelfBooks.map(index => <rect key={index} x={7 + index * 4.6}
          y={y + 12 - (index % 3) * 3} width="3.5" height={10 + (index % 3) * 3}
          fill={bookColors[(index + shelf) % bookColors.length]}/>)}
        <rect x="3" y={y + 21} width="37" height="3.4" fill="#d4a077"/>
      </g>)}
      <path d="M0 84H43V90H0ZM0 185H43V191H0Z" fill="#d6a880"/>
      <rect x="4" y="170" width="16" height="14" rx="1.5" fill="#b17c5b"/>
      <rect x="23" y="170" width="16" height="14" rx="1.5" fill="#c29370"/>
      <path d="M18 174V179M25 174V179" stroke="#edd3a5" strokeWidth="1.5"/>
      <PottedPlant x={24} y={84} scale={.54}/>
      <PottedPlant x={21} y={205} scale={.72} flowers/>
    </g>)}
    {[153, 837].map(x => <g key={x} transform={`translate(${x} 85)`}>
      <rect x="-2" y="0" width="13" height="27" rx="4" fill="#e7b56b" opacity=".24"/>
      <rect width="9" height="21" y="4" rx="2" fill="#f5ca7d" stroke="#9d7456" strokeWidth="2"/>
      <path d="M2 5H7M3 6V23" stroke="#fff3c6" strokeWidth="1.5"/>
      <path d="M-1 3H10M-1 26H10" stroke="#916044" strokeWidth="2"/>
    </g>)}
    <PottedPlant x={39} y={452} scale={.95} flowers/>
    <PottedPlant x={961} y={452} scale={.95} flowers/>
  </svg>;
}
