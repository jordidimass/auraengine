@AGENTS.md

# AuraEngine — media policy (mandatory)

Generated **posts** (images) and **reels** (videos) are produced by fal.ai. The file stays on the fal CDN. Convex persists only the URL string (`imageUrl` / `videoUrl`) plus status metadata.

- Do **not** upload fal output into Convex `_storage`.
- Do **not** add `imageStorageId` or `videoStorageId` for fal media.
- Vista 3 formats: `post` | `reel`. Preview uses the fal URL.
- Publisher downloads from that URL at publish time if posting live.
- ElevenLabs audio may still use `_storage`.
- fal API calls belong in Convex actions.

Do not put product rules in `AGENTS.md` — `next dev` regenerates that file.
