# Aura Engine — Esquema, endpoints y reparto

Especificación técnica del equipo. Va en la raíz del repo junto a `.cursorrules`
para que Cursor genere alineado en las cinco máquinas.

---

## Reparto del equipo

| Persona | Dominio | Archivos a su cargo |
|---|---|---|
| **Jordi** | Sistema de diseño | `components/ui/*`, tokens, paleta, `AuraCounter`, `RiskSlider` |
| **Josue** | Database | `convex/schema.ts`, queries y mutations, índices |
| **Deyane** | Conexiones | Apify, Exa, fal.ai, ElevenLabs, LLM — todas las actions externas |
| **Hugo** | Harness | Cableado end to end, estado de la app, rutas, integración |
| **Hector** | Harness | Cableado end to end, pruebas de flujo completo, demo |

**Regla de oro:** nadie edita archivos fuera de su columna sin avisar en el canal.
Josue mergea `schema.ts` primero — bloquea a todos los demás.

---

## Alcance

| Decisión | Resolución |
|---|---|
| Multi-marca | Un usuario maneja varias empresas. Todo cuelga de `brandId`. |
| Vistas | Tres. Preferencias, análisis, generación. |
| Ingesta | Pegar link del competidor. El monitoreo automático queda como stretch. |
| Nivel de riesgo | Barra 0–100 que controla qué tan agresiva sale la respuesta. |
| Auth | Convex Auth (email/password + Google). |

**Cambio respecto a la versión anterior:** las preferencias ya no viven en el usuario
sino en la marca. Un usuario con tres clientes tiene tres sets de tono independientes.

---

## Las tres vistas

### Vista 1 — Preferencias de comunicación
`/brands/[brandId]/preferences`

Configuración por marca. Se define una vez y se edita cuando haga falta.

- Datos de la marca: nombre, sitio, industria, descripción de a qué se dedica
- Tono por red social (LinkedIn formal, X roast, etc.)
- Nivel de riesgo por defecto
- Frases prohibidas y temas vetados

### Vista 2 — Análisis de competencia
`/brands/[brandId]/analyze`

El corazón del producto. Todo cabe en una pantalla.

- Campo para pegar el link del post o perfil competidor
- **Barra de nivel de riesgo** (0–100) — el único control que el usuario mueve de verdad
- Prompt simplificado: una línea opcional de contexto, nada más
- Resultado: debilidad detectada, Aura Score y la contranarrativa en borrador

El nivel de riesgo mapea así:

| Rango | Registro | Ejemplo de salida |
|---|---|---|
| 0–25 | Diplomático | Aporta un dato que complementa sin confrontar |
| 26–50 | Educativo | Corrige con evidencia, tono neutro |
| 51–75 | Directo | Señala el error sin adornos |
| 76–100 | Roast | Confrontación abierta con filo |

### Vista 3 — Generación de la publicación
`/brands/[brandId]/compose/[stealId]`

Toma el copy aprobado y produce la pieza terminada.

- fal.ai genera el visual a partir del prompt derivado del análisis
- Preview de la publicación como se vería en la red destino
- Edición del copy antes de cerrar
- Regenerar imagen sin volver a correr el análisis

**Fuera de estas tres:** landing, login y selector de marca. Nada más.

---

## Schema

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const platform = v.union(v.literal("x"), v.literal("linkedin"));

export default defineSchema({
  ...authTables,

  // ---------- Marcas ----------

  brands: defineTable({
    userId:      v.id("users"),
    name:        v.string(),
    website:     v.optional(v.string()),
    industry:    v.optional(v.string()),
    description: v.string(),        // a qué se dedica — se inyecta al prompt
    logoUrl:     v.optional(v.string()),
    archived:    v.boolean(),
    createdAt:   v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_active", ["userId", "archived"]),

  // ---------- Vista 1: preferencias ----------

  // Una fila por (marca, plataforma).
  brand_preferences: defineTable({
    brandId:  v.id("brands"),
    platform,
    enabled:  v.boolean(),
    tone: v.union(
      v.literal("formal"),
      v.literal("technical"),
      v.literal("roast"),
      v.literal("casual"),
    ),
    defaultRiskLevel:   v.number(),   // 0-100, precarga la barra en vista 2
    maxLength:          v.number(),
    useEmojis:          v.boolean(),
    useHashtags:        v.boolean(),
    customInstructions: v.optional(v.string()),
    bannedPhrases:      v.array(v.string()),
    bannedTopics:       v.array(v.string()),
  }).index("by_brand", ["brandId"])
    .index("by_brand_platform", ["brandId", "platform"]),

  // ---------- Vista 2: análisis ----------

  competitor_posts: defineTable({
    brandId:         v.id("brands"),
    platform,
    originalPostUrl: v.string(),
    originalContent: v.string(),
    authorHandle:    v.string(),
    metrics: v.object({
      likes:   v.number(),
      reposts: v.number(),
      replies: v.number(),
    }),
    topReplies: v.array(v.string()),   // señal de crítica del público
    status: v.union(
      v.literal("scraping"),
      v.literal("analyzing"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    error:      v.optional(v.string()),
    detectedAt: v.number(),
  }).index("by_brand_status", ["brandId", "status"])
    .index("by_url", ["brandId", "originalPostUrl"]),   // deduplicación

  aura_steals: defineTable({
    brandId:              v.id("brands"),
    competitorPostId:     v.id("competitor_posts"),
    targetPlatform:       platform,
    riskLevel:            v.number(),      // 0-100 usado en ESTA generación
    userContext:          v.optional(v.string()),   // la línea del prompt simplificado
    auraOpportunityScore: v.number(),      // 0-100
    targetWeakness:       v.string(),
    generatedResponse:    v.string(),
    editedResponse:       v.optional(v.string()),
    createdAt:            v.number(),
  }).index("by_post", ["competitorPostId"])
    .index("by_brand", ["brandId"]),

  // ---------- Vista 3: generación ----------

  publication_assets: defineTable({
    stealId:        v.id("aura_steals"),
    brandId:        v.id("brands"),
    visualPrompt:   v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    generation:     v.number(),   // se incrementa al regenerar
    createdAt:      v.number(),
  }).index("by_steal", ["stealId"]),

  // ---------- Salida ----------

  publications: defineTable({
    brandId:        v.id("brands"),
    stealId:        v.id("aura_steals"),
    platform,
    mode:           v.union(v.literal("live"), v.literal("draft")),
    finalText:      v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("pending"),
      v.literal("publishing"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    retryCount:     v.number(),
    lastError:      v.optional(v.string()),
    externalPostId: v.optional(v.string()),
    publishedAt:    v.optional(v.number()),
  }).index("by_status", ["status"])
    .index("by_brand", ["brandId"]),

  social_accounts: defineTable({
    brandId:           v.id("brands"),   // cada marca conecta sus propias cuentas
    platform,
    externalAccountId: v.string(),
    handle:            v.string(),
    accessToken:       v.string(),
    refreshToken:      v.optional(v.string()),
    expiresAt:         v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
  }).index("by_brand", ["brandId"])
    .index("by_brand_platform", ["brandId", "platform"]),

  aura_ledger: defineTable({
    brandId:   v.id("brands"),
    stealId:   v.id("aura_steals"),
    auraDelta: v.number(),
    reason:    v.string(),
    createdAt: v.number(),
  }).index("by_brand", ["brandId"]),
});
```

**Por qué `publication_assets` es tabla aparte y no columnas en `aura_steals`:**
regenerar la imagen es una acción frecuente en la vista 3. Separarla deja versionar
con `generation` sin ensuciar el registro del análisis.

---

## Endpoints

### `convex/brands.ts` — Josue

| Tipo | Nombre | Args | Devuelve |
|---|---|---|---|
| query | `listMine` | — | Marcas del usuario para el selector |
| query | `getById` | `{ brandId }` | Marca + sus preferencias |
| mutation | `create` | `{ name, website?, industry?, description }` | `Id<"brands">` + preferencias default |
| mutation | `update` | `{ brandId, ...campos }` | `null` |
| mutation | `archive` | `{ brandId }` | `null` |

### `convex/preferences.ts` — Josue

| Tipo | Nombre | Args | Devuelve |
|---|---|---|---|
| query | `getByBrand` | `{ brandId }` | Preferencias por plataforma |
| mutation | `upsert` | `{ brandId, platform, tone, defaultRiskLevel, maxLength, useEmojis, useHashtags, customInstructions, bannedPhrases, bannedTopics }` | `null` |
| mutation | `togglePlatform` | `{ brandId, platform, enabled }` | `null` |

### `convex/analysis.ts` — Deyane

| Tipo | Nombre | Args | Devuelve |
|---|---|---|---|
| action | `analyzeUrl` | `{ brandId, url, riskLevel, userContext?, targetPlatform }` | **Endpoint principal de la vista 2.** Raspa, analiza y guarda |
| query | `getPost` | `{ postId }` | Post + su steal — suscripción reactiva de la vista 2 |
| mutation | `savePost` | `{ brandId, platform, url, content, authorHandle, metrics, topReplies }` | `Id<"competitor_posts">` |
| mutation | `saveSteal` | `{ postId, riskLevel, userContext?, score, weakness, response }` | `Id<"aura_steals">` |
| action | `regenerateCopy` | `{ stealId, riskLevel }` | Rehace el copy con otro nivel de riesgo, sin volver a raspar |

### `convex/assets.ts` — Deyane

| Tipo | Nombre | Args | Devuelve |
|---|---|---|---|
| action | `generateImage` | `{ stealId }` | fal.ai → `_storage`. Incrementa `generation` |
| action | `generateVoice` | `{ stealId }` | ElevenLabs → `_storage` |
| query | `getAssets` | `{ stealId }` | URLs firmadas — suscripción de la vista 3 |
| mutation | `saveAsset` | `{ stealId, kind, storageId }` | `null` |

### `convex/publisher.ts` — Hugo / Hector

| Tipo | Nombre | Args | Devuelve |
|---|---|---|---|
| mutation | `enqueue` | `{ stealId, platform, finalText }` | Crea publicación y escribe en el ledger |
| action | `execute` | `{ publicationId }` | Publica. Reprograma con backoff si falla |
| query | `history` | `{ brandId, limit? }` | Publicaciones de la marca |
| query | `brandAura` | `{ brandId }` | Suma del ledger — alimenta el contador |

### `convex/social.ts` — Hugo / Hector

| Tipo | Nombre | Args | Devuelve |
|---|---|---|---|
| query | `listConnected` | `{ brandId }` | Cuentas y estado, **sin tokens** |
| action | `startOAuth` | `{ brandId, platform }` | URL de autorización |
| httpAction | `oauthCallback` | callback | Guarda tokens, redirige |

---

## El prompt del análisis — Deyane

Es la pieza que decide si el producto se siente inteligente o genérico. Recibe:

```
CONTEXTO DE MARCA
  nombre, industria, descripción (de brands)
  tono, frases prohibidas, temas vetados (de brand_preferences)

NIVEL DE RIESGO: {riskLevel}/100
  0-25 diplomático · 26-50 educativo · 51-75 directo · 76-100 roast

POST DEL COMPETIDOR
  contenido, autor, métricas, primeras respuestas

CONTEXTO DEL USUARIO (opcional)
  {userContext}

DEVUELVE JSON
  { weakness, auraScore, response, visualPrompt }
```

El `visualPrompt` sale del mismo llamado — evita una segunda ida al LLM
y mantiene la imagen coherente con el copy.

---

## Flujo de estados

```
competitor_posts.status
  scraping → analyzing → ready
                       ↘ failed

publication_assets.status
  generating → ready
             ↘ failed

publications.status
  pending → publishing → sent
                       ↘ failed   (tras 3 reintentos)
```

---

## Reglas del backend

1. **Toda query valida que la marca pertenezca al usuario de la sesión.** Sin excepción.
2. **Los tokens OAuth nunca salen del backend.**
3. **Deduplicar por `(brandId, originalPostUrl)`** — el mismo post analizado para dos
   marcas distintas son dos registros, y está bien.
4. **`publications.mode` es el interruptor de degradación.** Si el OAuth no llega a
   tiempo, `draft` deja el flujo funcionando sin tocar esquema ni frontend.
5. **Nada de borrados duros.** Todo es cambio de estado.

---

## Orden de construcción

Las dependencias reales entre las cinco personas:

| Bloque | Quién | Desbloquea a |
|---|---|---|
| 1. `schema.ts` a main | Josue | A todos — va primero |
| 2. Tokens y componentes base | Jordi | Hugo y Hector |
| 3. `brands.ts` + `preferences.ts` | Josue | Vista 1 |
| 4. `analyzeUrl` con Apify + LLM | Deyane | Vista 2 — el corazón |
| 5. `generateImage` con fal.ai | Deyane | Vista 3 |
| 6. Cableado de las tres vistas | Hugo y Hector | La demo |
| 7. Publicación real | Hugo y Hector | Lo último, y lo más degradable |

**Si a la hora 8 van tarde**, lo que no se recorta: análisis con score real,
la barra de riesgo cambiando el resultado, y la imagen de fal.ai en pantalla.
Eso es el producto. Todo lo demás es adorno.
