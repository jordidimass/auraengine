export type Platform = "x" | "linkedin" | "instagram";

export const PLATFORMS: readonly Platform[] = ["x", "linkedin", "instagram"];

export function platformLabel(platform: Platform): string {
  switch (platform) {
    case "x":
      return "X (Twitter)";
    case "linkedin":
      return "LinkedIn";
    case "instagram":
      return "Instagram";
  }
}

export function platformShortLabel(platform: Platform): string {
  switch (platform) {
    case "x":
      return "X";
    case "linkedin":
      return "LinkedIn";
    case "instagram":
      return "Instagram";
  }
}
