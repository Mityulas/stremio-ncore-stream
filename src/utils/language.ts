export const guessLanguage = (name: string, category?: string) => {
  if (category?.includes("HU")) return "🇭🇺";

  const split = name
    .toLowerCase()
    .replace(/\W/g, " ")
    .replace("x", " ")
    .split(" ");

  if (split.includes("hun") || split.includes("hungarian")) return "🇭🇺";
  if (split.includes("ger") || split.includes("german")) return "German";
  if (split.includes("fre") || split.includes("french")) return "🇫🇷";
  if (split.includes("ita") || split.includes("italian")) return "Italian";

  return "🇺🇸";
};
