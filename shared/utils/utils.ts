export function getRandomColor() {
  const number = Math.random();
  return number > 0.75
    ? 'var(--color-pink)'
    : number > 0.5
      ? 'var(--color-green)'
      : number > 0.25
        ? 'var(--color-blue)'
        : 'var(--color-orange)';
}

export function formatWashinOrderNumber(number: string | undefined) {
  if (!number) return '';
  return `${number.slice(0, 3)}-${number.slice(3, 6)}`;
}
