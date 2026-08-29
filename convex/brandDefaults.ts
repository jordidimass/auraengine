import type { Platform } from "./domain";

export function defaultPreferenceFor(platform: Platform) {
  if (platform === "x") {
    return {
      platform,
      enabled: true,
      tone: "roast" as const,
      defaultRiskLevel: 70,
      maxLength: 280,
      useEmojis: false,
      useHashtags: false,
      bannedPhrases: [],
      bannedTopics: [],
    };
  }

  return {
    platform,
    enabled: true,
    tone: "formal" as const,
    defaultRiskLevel: 40,
    maxLength: 3_000,
    useEmojis: false,
    useHashtags: false,
    bannedPhrases: [],
    bannedTopics: [],
  };
}
