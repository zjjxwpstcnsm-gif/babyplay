export const shadowAnimals = [
  { id: 'rabbit', name: '小兔', emoji: '🐰' },
  { id: 'cat', name: '小猫', emoji: '🐱' },
  { id: 'dog', name: '小狗', emoji: '🐶' },
  { id: 'bear', name: '小熊', emoji: '🐻' },
  { id: 'elephant', name: '大象', emoji: '🐘' },
  { id: 'duck', name: '小鸭', emoji: '🦆' },
] as const;
export type ShadowAnimalId = typeof shadowAnimals[number]['id'];
export default function ShadowAnimal({ animal }: { animal: ShadowAnimalId }) {
  return <svg className="shadow-silhouette" viewBox="0 0 300 330" aria-hidden="true" fill="currentColor">
    {animal === 'rabbit' && <><ellipse cx="111" cy="73" rx="25" ry="67" transform="rotate(-12 111 73)" /><ellipse cx="185" cy="73" rx="25" ry="67" transform="rotate(12 185 73)" /><ellipse cx="150" cy="167" rx="65" ry="59" /><ellipse cx="150" cy="260" rx="65" ry="63" /><ellipse cx="98" cy="307" rx="42" ry="17" /><ellipse cx="203" cy="307" rx="42" ry="17" /><circle cx="222" cy="274" r="23" /></>}
    {animal === 'cat' && <><path d="M91 116L87 35L140 82L169 82L218 35L215 121Z" /><ellipse cx="151" cy="137" rx="74" ry="61" /><ellipse cx="150" cy="249" rx="59" ry="75" /><path d="M196 292C273 289 238 221 259 197C279 172 297 204 280 212C267 220 305 318 194 318Z" /><ellipse cx="117" cy="310" rx="32" ry="14" /><ellipse cx="181" cy="310" rx="32" ry="14" /></>}
    {animal === 'dog' && <><ellipse cx="150" cy="126" rx="70" ry="61" /><ellipse cx="77" cy="139" rx="26" ry="68" transform="rotate(14 77 139)" /><ellipse cx="223" cy="139" rx="26" ry="68" transform="rotate(-14 223 139)" /><ellipse cx="150" cy="245" rx="61" ry="77" /><ellipse cx="104" cy="310" rx="37" ry="15" /><ellipse cx="195" cy="310" rx="37" ry="15" /><path d="M200 280Q259 271 244 230Q274 210 272 253Q269 307 195 307Z" /></>}
    {animal === 'bear' && <><circle cx="96" cy="73" r="32" /><circle cx="206" cy="73" r="32" /><ellipse cx="150" cy="130" rx="77" ry="71" /><ellipse cx="150" cy="248" rx="74" ry="72" /><ellipse cx="71" cy="230" rx="25" ry="51" transform="rotate(20 71 230)" /><ellipse cx="229" cy="230" rx="25" ry="51" transform="rotate(-20 229 230)" /><ellipse cx="97" cy="309" rx="37" ry="17" /><ellipse cx="202" cy="309" rx="37" ry="17" /></>}
    {animal === 'elephant' && <><ellipse cx="73" cy="136" rx="57" ry="78" /><ellipse cx="226" cy="136" rx="57" ry="78" /><ellipse cx="150" cy="135" rx="66" ry="73" /><ellipse cx="150" cy="251" rx="73" ry="69" /><path d="M134 155H172V229Q172 273 204 263Q236 248 229 280Q164 314 143 256Z" /><rect x="88" y="267" width="43" height="58" rx="15" /><rect x="174" y="267" width="43" height="58" rx="15" /></>}
    {animal === 'duck' && <><ellipse cx="143" cy="111" rx="60" ry="59" /><path d="M186 104Q226 91 248 115Q232 138 186 133Z" /><ellipse cx="141" cy="238" rx="94" ry="76" /><path d="M65 210L22 176Q10 241 59 267Z" /><path d="M108 290V313L77 326H140L130 306V290ZM164 290V312L145 326H210L186 306V289Z" /><path d="M129 59Q109 20 147 31L151 58Z" /></>}
  </svg>;
}
