import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// TODO: wire real OpenAI + ElevenLabs calls once API keys are set in the
// Convex dashboard (OPENAI_API_KEY, ELEVENLABS_API_KEY).
export const analyzeAndGenerateSteal = action({
  args: { competitorPostId: v.id("competitor_posts") },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(api.posts.getById, {
      id: args.competitorPostId,
    });
    if (!post) return;

    // Placeholder analysis until the OpenAI action is implemented.
    const auraOpportunityScore = 50;
    const targetWeakness = "TODO: run OpenAI weakness analysis";
    const generatedResponse = "TODO: run OpenAI counter-narrative generation";
    const projectedAuraGain = 0;

    await ctx.runMutation(api.auraSteals.insertSteal, {
      competitorPostId: args.competitorPostId,
      auraOpportunityScore,
      targetWeakness,
      generatedResponse,
      projectedAuraGain,
    });
  },
});
