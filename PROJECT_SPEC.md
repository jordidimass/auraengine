# AuraEngine — Competitor Aura Steal

Spec & architecture for the hackathon Content Machine track.

## Concept

An autonomous reactive platform that detects competitor posts with high
traction but weak arguments, calculates an "Aura Opportunity Score," and
generates a counter-narrative (plus optional ElevenLabs voiceover) ready to
publish in one click.

## Database Entities (Convex)

1. `competitor_posts`: competitor name, original post URL, content,
   likes/reposts metrics, and processing status
   (`detected` → `analyzing` → `ready` → `stolen`).
2. `aura_steals`: foreign key to competitor post, weakness analysis,
   generated counter-narrative response, ElevenLabs audio URL, projected
   Aura gain.

## Core User Flow

1. Ingest competitor posts via a Convex HTTP action (from n8n / Apify /
   Tavily) or manual URL paste.
2. Trigger a Convex Action: the LLM identifies weak points, drafts a
   counter-take, and generates an ElevenLabs audio clip.
3. Realtime dashboard: shows incoming competitor posts, an animated Aura
   points meter, an audio player, and a "Steal Aura" 1-click approval
   button.
4. On approval, a Convex scheduled action publishes to the target platform
   and updates the global Aura counter.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router) + Tailwind CSS |
| Animation | Framer Motion + Lucide Icons |
| Backend & DB | Convex (Mutations, Queries, Actions, Scheduled Functions) |
| AI | OpenAI API (GPT-4o) |
| Voice | ElevenLabs |
| Monitoring | Apify / Tavily |
| Orchestration | n8n |

## Setup

```bash
npm install
npx convex dev   # links/creates a Convex deployment, generates convex/_generated
npm run dev
```

Once `npx convex dev` has run, remove `convex/**/*` from `tsconfig.json`'s
`exclude` and `eslint.config.mjs`'s ignore list, and swap the mock feed in
`src/app/page.tsx` for `useQuery(api.posts.listPendingSteals)`.

## Env vars (set in the Convex dashboard, not `.env.local`)

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `BUFFER_ACCESS_TOKEN` / `BUFFER_PROFILE_ID`
