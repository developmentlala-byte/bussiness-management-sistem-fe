type TextTransformMode =
  | "uppercase"
  | "lowercase"
  | "sentencecase"
  | "capitalize";

export function textStyle(
  str: string | null | undefined,
  mode: TextTransformMode = "uppercase", // ✅ default diubah ke uppercase
): string {
  if (!str) return "";

  switch (mode.toLowerCase() as TextTransformMode) {
    case "uppercase":
      return str.toUpperCase();

    case "lowercase":
      return str.toLowerCase();

    case "sentencecase":
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    case "capitalize":
    default:
      const exceptions: string[] = [
        "and",
        "or",
        "the",
        "a",
        "an",
        "in",
        "on",
        "at",
        "to",
        "for",
        "dan",
        "di",
        "ke",
        "dari",
      ];

      return str
        .toLowerCase()
        .split(" ")
        .map((word, index) => {
          if (exceptions.includes(word) && index !== 0) {
            return word;
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
  }
}
