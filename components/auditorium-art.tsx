import { useId } from 'react';
import { AUDITORIUM_SCREEN } from '../lib/auditorium';

const floorShape = 'M169 205H831L1000 406V600H0V406Z';
const screenX = AUDITORIUM_SCREEN.left * 1000;
const screenY = AUDITORIUM_SCREEN.top * 600;
const screenWidth = AUDITORIUM_SCREEN.width * 1000;
const screenHeight = AUDITORIUM_SCREEN.height * 600;
const floorSeams = [229, 247, 268, 292, 320, 353, 390, 434, 485, 545];
const shelfBooks = [0, 1, 2, 3, 4, 5];

/** The decorative room shares screen-space coordinates with the interactive overlays. */
export function AuditoriumArt() {
  const id = useId();
  const maple = `${id}-maple`;
  const window = `${id}-window`;
  const floorClip = `${id}-floor`;
  const sideWall = <g>
    <path d="M0 0L169 44V206L0 410Z" fill="#c3d5eb"/>
    <path d="M0 345L169 179V206L0 410Z" fill="#88a7cf"/>
    <path d="M0 346L169 179" fill="none" stroke="#f4f5f9" strokeWidth="5"/>
    <path d="M15 21L147 61V202L15 345Z" fill="#bd906a" stroke="#fcf1e1" strokeWidth="7"/>
    <path d="M23 34L140 67V197L23 329Z" fill={`url(#${window})`}/>
    <path d="M23 237L60 184L82 195L111 151L140 164V197L23 329Z" fill="#b1c9ae"/>
    <path d="M61 45V285M103 56V237M19 137L143 110M19 234L143 155"
      fill="none" stroke="#f6ebdf" strokeWidth="5"/>
    <path d="M10 20Q22 94 18 155L12 282L0 308V14Z" fill="#fff8e8"/>
    <path d="M143 59L157 63L155 217L147 225Q153 142 143 59Z" fill="#fff6df"/>
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
      {floorSeams.map((y, index) => <g key={y} fill="none" stroke="#a97658" strokeWidth="1" opacity=".29">
        <path d={`M0 ${y}H1000`}/>
        {Array.from({length: 10}, (_, plank) => {
          const start = 40 + plank * 104 + (index % 2 ? 53 : 0);
          const end = 500 + (start - 500) * 1.045;
          return <path key={plank} d={`M${start} ${y}L${end} ${floorSeams[index + 1] ?? 600}`}/>;
        })}
      </g>)}
      <path d="M38 314L114 247L590 574L568 600H431ZM133 232L157 219L703 565L684 591Z"
        fill="#fff0bb" opacity=".43"/>
      <path d="M896 308L939 342L655 600H598Z" fill="#fff4d0" opacity=".28"/>
    </g>

    <path d="M166 177H834L873 210H127Z" fill="#eac29d" stroke="#c08b68" strokeWidth="2"/>
    <path d="M127 210H873V223H127Z" fill="#bd8968"/>
    <path d="M115 224H885V230H115Z" fill="#f4d2ab"/>
    <path d="M115 230H885V237H115Z" fill="#b88366"/>
    <rect x={screenX - 9} y={screenY - 8} width={screenWidth + 18} height={screenHeight + 16}
      rx="5" fill="#aa7652" stroke="#e0b38a" strokeWidth="3"/>
    <rect x={screenX} y={screenY} width={screenWidth} height={screenHeight} fill="#234e43"/>
    <path d={`M${screenX - 11} ${screenY + screenHeight + 8}H${screenX + screenWidth + 11}`}
      fill="none" stroke="#7e593f" strokeWidth="5"/>

    {[176, 786].map(x => <g key={x} transform={`translate(${x} 0)`}>
      <rect x="0" y="99" width="38" height="77" rx="3" fill="#b18264"/>
      <rect x="4" y="104" width="30" height="65" fill="#8e624e"/>
      {shelfBooks.map(index => <rect key={index} x={5 + index * 4.5}
        y={123 - (index % 3) * 4} width="3.7" height={14 + (index % 3) * 4}
        fill={['#dac0a0', '#a4bbd4', '#e6d7af'][index % 3]}/>)}
      <path d="M4 138H34V143H4ZM0 171H38V178H0Z" fill="#deb692"/>
      <rect x="8" y="147" width="22" height="17" rx="2" fill="#cc9f7f"/>
      <path d="M11 186H28L25 200H14Z" fill="#f5e7d8" stroke="#c1a78d"/>
      <path d="M19 187Q7 186 8 173Q17 170 20 182Q20 165 27 165Q35 176 23 186Z" fill="#7eac88"/>
    </g>)}
  </svg>;
}
