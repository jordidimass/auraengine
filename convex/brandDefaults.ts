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

  if (platform === "instagram") {
    return {
      platform,
      enabled: true,
      tone: "casual" as const,
      defaultRiskLevel: 55,
      maxLength: 2_200,
      useEmojis: true,
      useHashtags: true,
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
