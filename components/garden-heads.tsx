const dotEyes = (
  <g stroke="none" fill="currentColor">
    <circle cx="38" cy="26" r="1.7" />
    <circle cx="52" cy="26" r="1.7" />
  </g>
);

const blush = (
  <g stroke="none" fill="#f1b6a8">
    <ellipse cx="33.5" cy="30.5" rx="3" ry="1.8" />
    <ellipse cx="56.5" cy="30.5" rx="3" ry="1.8" />
  </g>
);

export const gardenHeads = {
  mushroom: <g>
    <path fill="#fff3d9" d="M32 19h26c-1 7 2 12 4 16 2 5-3 8-9 8H37c-6 0-11-3-9-8 2-5 5-9 4-16Z" />
    <path fill="#e78779" d="M22 20C24 11 32 3 43 2c11-1 20 5 26 15 3 5 0 8-6 8-10 0-14-5-22-4-7 0-13 4-18 2-1 0-2-1-1-3Z" />
    <g fill="#ffefd6" stroke="none">
      <ellipse cx="32" cy="14.5" rx="3.2" ry="2" transform="rotate(-27 32 14.5)" />
      <ellipse cx="44" cy="8.5" rx="3.8" ry="2.2" />
      <ellipse cx="58" cy="15" rx="3.4" ry="2.2" transform="rotate(26 58 15)" />
    </g>
    {dotEyes}{blush}
    <path d="M42 30.5q3 4 6 0" />
  </g>,
  acorn: <g>
    <path fill="#edbe87" d="M29 18q16-6 32 0c1 11-2 20-12 23l-4 3-4-3c-10-3-13-13-12-23Z" />
    <path fill="#ab7753" d="M43 9c-2-5 1-7 4-7l2 1c-3 2-3 4-2 6Z" />
    <path fill="#cd976c" d="M25 18C26 9 34 6 44 6s19 3 21 12c1 4-3 5-7 3q-5 3-10-1-6 3-11-1-7 3-12 0Z" />
    <path stroke="#875c47" strokeWidth="1.2" d="m35 12 2 2 2-2m9-1 2 2 2-2" />
    {dotEyes}{blush}
    <path d="M42 30q2 4 5 1" />
  </g>,
  cloud: <g>
    <path fill="#e9f5ff" d="M29 37c-11 0-13-15-3-18-1-7 6-13 13-10 5-11 21-9 23 3 8 0 12 7 9 13 4 8-4 15-13 12-6 7-18 7-24 1Z" />
    <path d="M34.5 26q3-5 6 0m8.5 0q3-5 6 0" />
    {blush}
    <path d="M42 30q3.5 4.5 7 0" />
  </g>,
  chick: <g>
    <path fill="#ffe491" d="M26 32c0-10 6-18 15-19-5-2-7-7-5-8 2-2 6 1 9 5 1-6 4-8 6-7 2 1 1 6-1 10 9 2 15 11 15 19 0 8-9 12-19 12S26 40 26 32Z" />
    {dotEyes}{blush}
    <path fill="#f4a151" strokeWidth="1.4" d="m40.5 30 4.5-2.5 4.5 2.5-4.5 3.5Z" />
  </g>,
  otter: <g>
    <circle cx="28.5" cy="17" r="5" fill="#b9866d" />
    <circle cx="61.5" cy="17" r="5" fill="#b9866d" />
    <path fill="#cfa78c" d="M25 28c0-10 10-17 20-17 11 0 20 7 20 17 0 10-8 15-20 15S25 38 25 28Z" />
    <path fill="#fff0d6" stroke="none" d="M31 33c0-6 9-10 14-6 6-4 14 0 14 6 0 6-7 9-14 9s-14-3-14-9Z" />
    <g transform="translate(0 -2)">{dotEyes}</g>
    <path fill="currentColor" stroke="none" d="M41 27q4-2 8 0-1 4-4 4t-4-4Z" />
    <path d="M45 30v2m0 0q-2 3-5 1m5-1q2 3 5 1" strokeWidth="1.4" />
    <path d="m32 30-8-2m8 5-8 1m34-4 8-2m-8 5 8 1" strokeWidth="1.3" />
  </g>,
  panda: <g>
    <g fill="#50546a"><circle cx="29" cy="11" r="7" /><circle cx="60.5" cy="11" r="7" /></g>
    <path fill="#fffaf0" d="M24 30c0-12 9-21 21-21s21 9 21 21c0 9-8 13-21 13s-21-4-21-13Z" />
    <g fill="#535568" stroke="none">
      <ellipse cx="36.5" cy="24.5" rx="5.7" ry="7" transform="rotate(30 36.5 24.5)" />
      <ellipse cx="53.5" cy="24.5" rx="5.7" ry="7" transform="rotate(-30 53.5 24.5)" />
    </g>
    <g fill="#fff" stroke="none"><circle cx="37" cy="23.5" r="1.5" /><circle cx="53" cy="23.5" r="1.5" /></g>
    <path fill="currentColor" stroke="none" d="M42.5 29q2.5-1.6 5 0-.6 2.7-2.5 2.7T42.5 29Z" />
    <path d="M42 33q3 2.5 6 0" strokeWidth="1.5" />
  </g>,
  axolotl: <g>
    <g fill="#ee9aaa" strokeWidth="1.6">
      <path d="M29 29c-5 3-10 3-11 0 0-2 5-3 7-4-4 0-10-4-8-7 1-2 6 1 10 3-3-5-6-10-3-12 3-1 6 7 8 11Z" />
      <path d="M61 29c5 3 10 3 11 0 0-2-5-3-7-4 4 0 10-4 8-7-1-2-6 1-10 3 3-5 6-10 3-12-3-1-6 7-8 11Z" />
    </g>
    <path fill="#ffdae1" d="M26 28c0-11 8-17 19-17s19 6 19 17c0 9-9 14-19 14s-19-5-19-14Z" />
    {dotEyes}
    <g stroke="none" fill="#eea0b5"><ellipse cx="33.5" cy="30" rx="3" ry="2" /><ellipse cx="56.5" cy="30" rx="3" ry="2" /></g>
    <path d="M39.5 30q5.5 6 11 0" />
  </g>,
};
