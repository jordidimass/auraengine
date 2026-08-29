# Prompt para Cursor — Landing page de Aura Engine

Pega esto completo en Cursor Composer (`Cmd + I`). Referencia primero los archivos del
proyecto con `@` si ya existen: `@.cursorrules @PROJECT_SPEC.md`

---

## PROMPT

```
Construye la landing page de "Aura Engine". Esta página no es marketing genérico:
es la pieza de presentación de un hackathon. Se va a proyectar en pantalla grande
frente a jueces que tienen tres minutos de atención y que ya vieron veinte proyectos
antes que el nuestro. Todo lo que esté en la página tiene que ganarse su lugar.

═══════════════════════════════════════════════
QUÉ ES EL PRODUCTO
═══════════════════════════════════════════════

Aura Engine es una plataforma de inteligencia competitiva para redes sociales.

El usuario pega el link de una publicación de un competidor. El sistema la raspa,
un LLM detecta la debilidad concreta del argumento —dato flojo, hueco lógico,
comentarios criticándolo— y calcula un "Aura Opportunity Score" de 0 a 100 que
mide qué tan aprovechable es esa oportunidad.

Con una barra de nivel de riesgo (0-100) el usuario decide qué tan agresiva sale
la respuesta: diplomática, educativa, directa o roast. El motor genera el copy
adaptado al tono de la marca, una imagen con fal.ai y un audio con ElevenLabs.
El resultado es una publicación terminada, lista para salir.

La tesis del producto en una frase: los generadores de contenido escriben en el
vacío; Aura Engine escribe en el momento correcto, cuando alguien más ya capturó
la atención pero dejó el flanco abierto.

Maneja varias marcas por usuario, cada una con su propio tono por red social.

Stack: Next.js (App Router), Tailwind, Convex como backend, Apify y Exa para
scraping y contexto, fal.ai para imagen, ElevenLabs para voz.

═══════════════════════════════════════════════
SISTEMA DE DISEÑO — RESPÉTALO EXACTO
═══════════════════════════════════════════════

Estética: dark cyberpunk contenida. El color significa algo o no está.
Nada de gradientes decorativos ni de degradados morado-a-rosa de plantilla SaaS.

Colores (defínelos como CSS variables):
  --void:    #0A0A0F   fondo principal
  --surface: #14121F   cards y superficies elevadas
  --border:  #2A2740   bordes de 1px
  --aura:    #A855F7   púrpura eléctrico — marca y acción
  --gain:    #A3E635   lima — aura ganada, estados positivos
  --drain:   #F472B6   rosa — aura perdida, riesgo alto
  --cyan:    #22D3EE   apoyo en estados de proceso
  --text:    #E8E6F0
  --muted:   #9A95AE

Tipografía:
  - Wordmark "AURA ENGINE": sans geométrica en mayúsculas, letter-spacing 3px.
    Usa Space Grotesk o Inter con tracking forzado.
  - Interfaz: Inter, solo pesos 400 y 500. Nada más pesado.
  - Números, scores y datos: JetBrains Mono. Los números en monospace le dan
    peso de instrumento de medición, no de infografía.

Logo: un anillo abierto — el halo. Un círculo con borde de 6px en --aura y sin
relleno. Es el aura como campo de energía alrededor de algo. Hazlo en SVG inline,
no como imagen. Debe funcionar a 16px de favicon y a 200px en el hero.

Reglas duras:
  - Bordes de 1px en --border. NUNCA sombras difusas: en fondo oscuro se ven sucias.
  - Radio 6px en cards, 20px en pills.
  - Sentence case en todo. Mayúsculas solo en el wordmark y en labels de 8-10px.
  - Un solo botón primario por sección. Todo lo demás es secundario o fantasma.
  - Espaciado generoso. La página debe respirar; el fondo negro es parte del diseño.

═══════════════════════════════════════════════
SECCIONES — EN ESTE ORDEN
═══════════════════════════════════════════════

1. HERO
   El halo en SVG, animado con una rotación lenta y continua (20s por vuelta,
   linear, infinita). Debajo el wordmark AURA ENGINE.
   Tagline: una línea que diga la tesis, no que la explique.
   Un CTA primario ("Ver cómo funciona", scroll suave a la sección 3) y uno
   secundario ("Entrar", link a /login).
   Ocupa toda la altura del viewport. Sin imágenes de stock, sin ilustraciones.

2. EL PROBLEMA
   Tres o cuatro líneas, máximo. Que las herramientas de contenido generan en el
   vacío, sin saber si el momento es el correcto. Nada de estadísticas inventadas
   ni de "el 87% de los marketers...". Si no tenemos el dato, no lo ponemos.

3. CÓMO FUNCIONA — tres pasos
   Tres cards horizontales en desktop, apiladas en móvil. Cada una con un número
   en monospace, un título corto y dos líneas de descripción.
   Paso 1: Pega el link del competidor.
   Paso 2: El motor detecta la debilidad y puntúa la oportunidad.
   Paso 3: Elige el nivel de riesgo y sale la publicación con imagen y voz.

4. LA BARRA DE RIESGO — la sección clave, hazla interactiva
   Esta es la que tiene que hacer que los jueces se inclinen hacia adelante.
   Un slider funcional de 0 a 100. Al moverlo, el texto de ejemplo debajo cambia
   en vivo entre cuatro versiones hardcodeadas de la MISMA respuesta a un post
   ficticio de competidor.

   Rangos y registro:
     0-25   Diplomático — aporta un dato que complementa sin confrontar
     26-50  Educativo   — corrige con evidencia, tono neutro
     51-75  Directo     — señala el error sin adornos
     76-100 Roast       — confrontación abierta con filo

   El color del slider y del label interpolan de --cyan (riesgo bajo) a --drain
   (riesgo alto), pasando por --aura en el medio.
   El cambio de texto debe tener una transición suave, no un corte seco.
   Escribe tú las cuatro variantes de ejemplo: que sean creíbles y que la
   diferencia de tono entre la 1 y la 4 sea evidente al leerlas.

5. STACK
   Fila de logos o pills con: Convex, Next.js, Apify, Exa, fal.ai, ElevenLabs, n8n.
   Sobria. Sin tarjetas grandes ni descripciones largas — los jueces conocen
   estas herramientas. Destaca Convex visualmente porque es el backend del track.

6. EQUIPO
   Cinco personas con nombre y rol:
     Jordi   — Sistema de diseño
     Josue   — Database
     Deyane  — Conexiones e IA
     Hugo    — Integración
     Hector  — Integración
   Formato simple: nombre en --text, rol en --muted debajo. Sin fotos.

7. FOOTER
   "Aura Engine · The Next Craft · Track 01 — Content Machine"
   El halo pequeño a la izquierda. Una línea, discreta.

═══════════════════════════════════════════════
REQUISITOS TÉCNICOS
═══════════════════════════════════════════════

- Next.js App Router. La landing es la ruta `/` y es un Server Component,
  salvo la sección del slider que va en su propio Client Component.
- Tailwind con los colores definidos como variables en `globals.css` y
  extendidos en `tailwind.config.ts`. No hardcodees hex en los componentes.
- TypeScript estricto. Interfaces para todas las props.
- Framer Motion solo para: la rotación del halo, la aparición de las cards al
  entrar en viewport, y la transición del texto del slider. Nada más — si todo
  se mueve, nada destaca.
- Responsive de verdad. Se va a ver en un proyector y en el teléfono de un juez.
- Accesible: contraste suficiente, el slider navegable por teclado, `aria-label`
  en los controles.
- Sin dependencias nuevas más allá de framer-motion y lucide-react.

═══════════════════════════════════════════════
QUÉ NO HACER
═══════════════════════════════════════════════

- Nada de lorem ipsum ni de placeholders. Todo el texto es final y en español.
- Nada de métricas inventadas, logos de clientes falsos ni testimonios.
- Nada de "Powered by AI" ni de copy vacío de landing genérica.
- Nada de secciones de precios, FAQ o newsletter. Esto es un pitch, no un SaaS.
- Nada de imágenes de stock, ilustraciones 3D ni blobs de fondo.
- No inventes features que no describí arriba.

═══════════════════════════════════════════════
ENTREGABLES
═══════════════════════════════════════════════

  app/page.tsx                      la landing completa
  app/globals.css                   variables de color y fuentes
  tailwind.config.ts                extensión del tema
  components/landing/Hero.tsx
  components/landing/HowItWorks.tsx
  components/landing/RiskSlider.tsx (Client Component)
  components/landing/StackRow.tsx
  components/landing/Team.tsx
  components/ui/Halo.tsx            el logo en SVG, con prop de tamaño

Genera código limpio, tipado y listo para correr. Si algo del diseño te parece
ambiguo, resuélvelo del lado más sobrio.
```

---

## Notas para el equipo

**El slider es lo que hay que cuidar.** El resto de la landing es contexto; esa sección
es la demostración del producto sin pedirle a nadie que se registre. Si solo alcanza
para pulir una cosa, es esa.

**Las cuatro variantes de texto las escribe Cursor, pero revísenlas.** Si la diferencia
entre "diplomático" y "roast" no se siente al leerlas, el gancho del producto se cae ahí
mismo. Vale la pena que Jordi o quien tenga mejor oído las reescriba a mano.

**Jordi debería correr este prompt**, ya que la landing y el sistema de diseño comparten
tokens. Lo que salga de aquí alimenta los componentes de las tres vistas.
