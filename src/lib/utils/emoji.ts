export function isSingleEmoji(input: string): boolean {
  const value = input.trim();
  if (value.length === 0) return false;
  const singleEmojiRegex = /^(?:\p{Extended_Pictographic}\uFE0F?)(?:\u200D(?:\p{Extended_Pictographic}\uFE0F?))*$/u;
  return singleEmojiRegex.test(value);
}

export function sanitizeEmoji(input: string): string {
  return input.trim();
}


