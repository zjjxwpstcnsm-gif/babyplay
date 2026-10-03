export type Lesson = 'numbers' | 'letters' | 'hanzi';
export const lessons = [
  { id: 'numbers', label: '认数字', icon: '123' },
  { id: 'letters', label: '认字母', icon: 'ABC' },
  { id: 'hanzi', label: '认汉字', icon: '字' },
] as const;
export const characters: Record<Lesson, string[]> = {
  numbers: [...'0123456789'],
  letters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  hanzi: [...'一二三人大小上下口日月山水火木土'],
};
export type LearningRound = { character: string; choices: string[] };
export function makeRound(lesson: Lesson, previous?: string): LearningRound {
  const pool = characters[lesson];
  const available = pool.filter(char => char !== previous);
  const character = available[Math.floor(Math.random() * available.length)];
  const distractors = pool.filter(char => char !== character);
  const choices = [character];
  while (choices.length < 3) choices.push(distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0]);
  // Fisher-Yates keeps the correct answer from always appearing in one place.
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { character, choices };
}
export function characterForKey(lesson: Lesson, round: LearningRound, key: string): string | undefined {
  if (lesson === 'hanzi' && /^[123]$/.test(key)) return round.choices[Number(key) - 1];
  const character = key.toUpperCase();
  return characters[lesson].includes(character) ? character : undefined;
}
export function characterSpeech(lesson: Lesson, character: string) {
  const digitNames = [...'零一二三四五六七八九'];
  return lesson === 'numbers' ? `数字${digitNames[Number(character)]}` : lesson === 'letters' ? `字母 ${character}` : `汉字，${character}`;
}
