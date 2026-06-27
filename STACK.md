# Stack técnico — MUTEX + Juguetico (handoff para desarrolladores)

Guía completa de la pila técnica, servicios, recursos y decisiones del sitio del Museo Textil de Antigua y del aplicativo Juguetico. Pensada como punto de entrada para cualquier desarrollador que tome el proyecto.

> Versión en Notion (más legible): https://app.notion.com/p/38cc7169d896818ea6faf64a80b7fefe
> Última actualización: junio 2026 (rama `main`, commit `ef77554`).

---

## 1. Vista panorámica

El proyecto vive en **un solo repositorio** y **un solo dominio**, pero internamente combina dos cosas distintas:

- **Sitio MUTEX** — landing estática de 3 páginas (`index.html`, `conocenos.html`, `siguenos.html`) con tipografía custom, animaciones de entrada y un formulario que captura leads.
- **Juguetico** — aplicativo interactivo donde el usuario diseña su propio patrón textil tipo huipil y se lo envía por correo en PDF. Vive en `juguetico.html` (versión deployada en producción) y `juguetico.jsx` (prototipo React paralelo, no usado en prod).

| Cosa | URL |
|------|-----|
| Repo | https://github.com/juancmarin/museo-textil-antigua |
| Preview en vivo | https://museo-textil-antigua.vercel.app |
| Dominio final (pendiente DNS) | museotextildeantigua.com |

3.423 líneas de código en total. Sin `package.json` para el sitio principal — Juguetico sí depende de Node en el backend.

---

## 2. MUTEX — Sitio estático

### 2.1 Stack

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Markup | HTML5 semántico (3 páginas) | Sitio de pre-apertura con poca interacción |
| Estilos | CSS3 puro, un solo `styles.css` (~1.078 líneas) | Suficiente para 3 páginas; cero build tooling |
| Interacción | JavaScript vanilla, sin framework | IntersectionObserver, fetch, FormData, DOM |
| Tipografía dinámica | Variable fonts + eje custom | `font-variation-settings: 'EXPO' -100` |
| Animaciones | CSS keyframes + IntersectionObserver (`assets/anim.js`) | Estilo Framer Motion sin la librería |
| SVG glyph rendering | `opentype.js` CDN + `assets/glyphify.js` | Convierte texto MTA Doble a SVG paths (anti-aliasing macOS Retina) |

**Sin build step:** lo que escribes es lo que se sirve. Sin Webpack, Vite, Babel, npm install.

### 2.2 Estructura del repo

```
MUTEX/
├── index.html          # Home (hero con wordmark + tagline)
├── conocenos.html      # Página de información del museo
├── siguenos.html       # Formulario de captura de leads
├── juguetico.html      # Aplicativo interactivo (versión deployada)
├── juguetico.jsx       # Prototipo React paralelo (NO se usa en prod)
├── styles.css          # Estilos compartidos + responsive
├── assets/
│   ├── fonts/          # 7 archivos de tipografías custom (~5.6 MB)
│   ├── wordmark-naranja.svg
│   ├── logo-mutex-siguenos.svg
│   ├── motivo-textil.gif       # 2.1 MB — patrón animado
│   ├── patron_conocenos_1.svg
│   ├── patron_conocenos_2.svg
│   ├── patron-claro.svg
│   ├── anim.js                  # IntersectionObserver para fade-ins
│   ├── glyphify.js              # Renderiza MTA Doble como SVG paths
│   ├── favicon.ico / .svg
│   ├── apple-touch-icon.png
│   └── icon-192.png / icon-512.png
├── README.md
└── STACK.md            # Este documento
```

### 2.3 Tipografía (lo más singular del proyecto)

El sitio usa **dos familias custom, ambas embebidas localmente** (no Google Fonts ni Adobe Fonts):

#### Exposure (205TF) — cuerpo, nav, botones, headlines

- Fuente **variable** con eje custom `EXPO` que va de **-100 a 100** (default 0).
- **No tiene eje `wght` tradicional.** Para "negrita" se usa:

```css
font-variation-settings: 'EXPO' -100;  /* máximo bold */
font-variation-settings: 'EXPO' -75;   /* home headline */
font-variation-settings: 'EXPO' -50;   /* nav móvil */
font-variation-settings: 'EXPO' -25;   /* leads */
font-variation-settings: 'EXPO' 0;     /* regular (default) */
```

**El eje está invertido:** valores **negativos = más grueso**. Documentado con la variable CSS `--expo-bold` en `:root`.

Archivos: `205TF-Exposure-ExposureVAR.ttf` (1.2 MB) y `205TF-Exposure-ExposureVARItalic.ttf` (1.3 MB).

#### MTA — títulos display

Familia diseñada por **Federico Parra** específicamente para el museo. Cinco variantes:

- `MTA-Regular.otf` (17 KB)
- `MTA-Negrita.otf` (8.1 KB)
- `MTA-Itálica.otf` (18 KB)
- `MTA-Contorno.otf` (13 KB) — decorativa, no usada
- `MTA-Doble.otf` (13 KB) — la principal: cada letra es una malla de rombos

**MTA Doble tiene un problema en macOS Retina:** el anti-aliasing emborrona los rombos chicos. Solución: `glyphify.js` carga la fuente con **opentype.js** y rinde los títulos como `<svg>` con paths reales. Elementos con `data-glyphify` reciben este tratamiento automáticamente.

#### Fallback

**Zilla Slab** (Google Fonts) cargada vía CDN solo como fallback:

```css
--font-display: 'MTA', 'Zilla Slab', serif;
--font-body:    'Exposure', 'Zilla Slab', serif;
--font-mosaic:  'MTA Doble', 'MTA', serif;
```

### 2.4 Sistema de animaciones

Dos archivos hacen todo el trabajo:

**`assets/anim.js`** (~50 líneas): busca elementos con `data-anim`, los oculta inicialmente y los revela cuando entran al viewport (IntersectionObserver con threshold 0.1). Soporta:
- `data-anim-delay="200"` — ms de delay
- `data-anim-eager` — revela inmediato sin esperar viewport
- Respeta `prefers-reduced-motion: reduce`

**Keyframes en `styles.css`** definen los movimientos (fadeUp, fadeIn, stagger). Curvas `cubic-bezier` imitan los presets de Framer Motion.

Ejemplo:
```html
<header class="topbar" data-anim data-anim-delay="50">
```

### 2.5 Formulario de captura (Síguenos)

**Servicio:** [Formspree](https://formspree.io)

| Detalle | Valor |
|---------|-------|
| Endpoint | `https://formspree.io/f/mvznzgnn` |
| Plan | Free (50 envíos / mes) |
| Destinatario | `contacto@museotextildeantigua.com` |
| Campos | Nombre, Apellido, Email |

Lógica del submit en `siguenos.html` (script inline):
1. Valida los 3 campos con `checkValidity()` nativo.
2. `fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })`.
3. Botón a `ENVIANDO…` durante la espera.
4. Si OK → vista "¡Registro exitoso! Pronto recibirás más información."
5. Si falla → mensaje de error, reactiva el botón.

Cambiar el destinatario o el servicio: editar el `action` del `<form id="newsletter-form">`. Brevo y Mailchimp funcionan con el mismo HTML.

### 2.6 Responsive

Mobile-first con un solo breakpoint principal: `@media (max-width: 768px)`.

Detalles específicos del Figma (fáciles de romper sin contexto):
- **Home móvil:** patrón textil entre body y footer (no arriba), vía `grid-template-rows: auto auto 1fr auto`.
- **Conócenos móvil:** todas las cajas de texto capadas a `width: 302px`, centradas con `justify-items: center`.
- **Síguenos móvil:** form container 302px con Nombre + Apellido en una sola fila (flex-wrap + flex-basis 100% en Email).
- **Conócenos móvil:** el patrón inferior (`patron_conocenos_2`) está oculto con `display: none` — solo aparece en desktop.

### 2.7 Anti-copia de assets

Patrones SVG y GIF del motivo textil:
```css
pointer-events: none;
user-select: none;
-webkit-user-drag: none;
-webkit-touch-callout: none;
```
No previene a un usuario decidido (Network tab) pero bloquea drag, right-click → save y selección casual.

---

## 3. Juguetico — Aplicativo interactivo

### 3.1 Qué es

El usuario dibuja un patrón textil en un grid de rombos (estilo huipil), lo guarda en la galería colectiva del museo, y recibe el diseño por correo en formato PDF.

### 3.2 Dos versiones del frontend

**`juguetico.html`** (1.394 líneas) — **versión deployada y activa** en producción.
HTML/CSS/JS vanilla con estilos inline en `<style>` del head. Usa `Instrument Sans` de Google Fonts. Hace `fetch` a `/api/guardar` y `/api/galeria`.

**`juguetico.jsx`** (571 líneas) — **prototipo React paralelo**.
Creado primero como mockup; quedó en el repo pero **no se sirve**. Importa Lucide React icons. Si en el futuro se quiere migrar a React, es el punto de partida.

> ⚠️ **Si vas a desarrollar Juguetico, trabaja sobre `juguetico.html`**, no sobre el `.jsx`. El JSX no está conectado a las APIs ni a Supabase.

### 3.3 Backend de Juguetico

Montado como Vercel Functions:

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/guardar` | POST | Recibe el diseño + email + términos. Guarda en Supabase y dispara email con PDF vía Resend. |
| `/api/galeria` | GET | Devuelve los últimos N diseños públicos para la galería. |

**Runtime:** Node 22 (Vercel Functions, forzado en commit `725f499`).

**Persistencia:** [Supabase](https://supabase.com)
- Tabla `designs` con `id`, `grid` (JSON con matriz binaria), `email`, `ts`, etc.
- **Importante**: la opción `Expose tables` está desactivada en Supabase, por lo que cada tabla nueva necesita un `GRANT` explícito a `service_role`. Ver commit `5a58e8e`.

**Email:** [Resend](https://resend.com) — `/api/guardar` envía el PDF del diseño como attachment.

### 3.4 Lógica del editor

Estado (mismo modelo en `.html` y `.jsx`):
- `grid` — matriz de 18×10 booleanos (1 = pintado, 0 = vacío).
- `tool` — `"draw" | "erase"`.
- `history` — pila de los últimos 20 estados (undo limitado).
- `view` — `"editor" | "preview" | "gallery" | "success"`.
- `gallery` — diseños cargados al montar.

Funciones clave:
- `cellCenter(r, c)` — coordenadas del centro de un rombo en el SVG (offset por fila para el patrón hexagonal).
- `hitTest(mx, my, rows, cols)` — distancia Manhattan normalizada para detectar clicks en un rombo.
- `mirrorH()` / `mirrorV()` — flip del patrón completo.
- `resizeGrid(r, c)` — redimensiona preservando contenido (4 a 24 filas/columnas).
- `MiniGrid` — rinde el grid como SVG estático para thumbnails.
- `maskEmail("perezpepito@gmail.com")` → `"pe••••@gmail.com"` — privacidad en la galería pública.

### 3.5 Paleta de Juguetico

Distinta a la del sitio principal (más cálida, terrosa):

```
--achiote:  #FF6927   (naranja, mismo que MUTEX)
--sacbe:    #E8E5D9   (cream, mismo que MUTEX)
--dark:     #2D2520   (marrón oscuro)
--mid:      #6B5E54   (texto secundario)
--light-bg: #F5F3ED   (fondo alterno)
```

Vocabulario maya/textil (achiote = pigmento; sacbé = camino blanco).

---

## 4. Servicios externos

| Servicio | Para qué | Cuenta / detalle |
|----------|----------|------------------|
| **GitHub** | Repo + trigger de CI | `juancmarin/museo-textil-antigua` (rama `main`) |
| **Vercel** | Hosting + Edge CDN + SSL + Functions | Team `jminterfazcos-projects`, proyecto `museo-textil-antigua`, projectId `prj_kzS6lCeVmwqyBs0E32h9TpsPhcjv` |
| **Formspree** | Backend del form de Síguenos | Endpoint `mvznzgnn`, plan free |
| **Supabase** | Base de datos de Juguetico (`designs`) | URL y service_role key en env vars de Vercel |
| **Resend** | Envío de email con PDF (Juguetico) | API key en env vars de Vercel |
| **GoDaddy** | Registro del dominio | `museotextildeantigua.com` (DNS pendiente) |
| **Google Fonts** | Solo fallback (Zilla Slab, Instrument Sans) | CDN público |

### 4.1 Variables de entorno (Vercel)

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...    # NO la anon key — necesita service_role
RESEND_API_KEY=re_...
RESEND_FROM=Juguetico <hola@museotextildeantigua.com>
```

**Si una función falla con 500:** revisar que estén seteadas en Production Y Preview.

### 4.2 DNS pendiente

En GoDaddy del dominio `museotextildeantigua.com`:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | `76.76.21.21` | 1 hora |
| CNAME | www | `cname.vercel-dns.com` | 1 hora |

Borrar registros de "parking" si los hay. **No tocar** MX (correo) ni TXT.

---

## 5. Decisiones técnicas (con el porqué)

### 5.1 Sin framework para el sitio principal
3 páginas con baja interactividad. Un framework agrega build, bundle JS, routing, complejidad. <100 ms de carga. Cualquier dev con HTML/CSS básico lo mantiene.
**Cuándo cambiarlo:** 8+ páginas dinámicas o CMS headless → Astro / Next con SSG.

### 5.2 Variable fonts con eje custom
1 archivo TTF cubre todo el rango de pesos. Antes serían 5 woff2 separados. Declaraciones `font-variation-settings: 'EXPO' -75` documentan la intención.
**Trade-off:** TTF es 30-40% más pesado que WOFF2. Convertir es nice-to-have.

### 5.3 SVG paths para MTA Doble (`glyphify.js`)
MTA Doble se emborrona en Retina por el anti-aliasing tipográfico. SVG paths no reciben ese tratamiento → rombos crispy.
**Trade-off:** títulos no seleccionables (`aria-label` mantiene accesibilidad).

### 5.4 Formspree en vez de backend propio
50 leads/mes free, anti-spam incluido. Migración a Brevo/Mailchimp: cambiar `action=""`.
**Cuándo migrar:** doble opt-in (Brevo) | unificar con campañas (Mailchimp) | volumen >50/mes.

### 5.5 Vercel sobre el hosting de GoDaddy
Preview URLs por rama, edge CDN, SSL auto, deploy en 30 seg, Vercel Functions para el backend de Juguetico. GoDaddy obliga FTP, no tiene Functions.

### 5.6 Supabase para Juguetico
Plan free generoso (500 MB, 50k MAU). Postgres real → SQL analytics en el futuro.
**Gotcha:** `Expose tables` apagado por seguridad. Tablas nuevas requieren `GRANT SELECT, INSERT ON public.<tabla> TO service_role;` manual desde el SQL Editor.

### 5.7 Resend para email
API minimal, soporte de attachments (necesario para el PDF), 100 emails/día gratis.

### 5.8 Animaciones con IntersectionObserver
Sin React = Framer Motion no aplica. IntersectionObserver es nativo, soporte universal. Atributos `data-anim` se aplican declarativamente.

---

## 6. Workflow de desarrollo

### 6.1 Correr localmente

```bash
python3 -m http.server 8123
```

Abrir http://localhost:8123. No requiere instalar nada.

> **Juguetico con backend funcional en local:** correr `vercel dev` (requiere `npm i -g vercel` y `vercel link` previo).

### 6.2 Deployar

```bash
git add <archivos>
git commit -m "<mensaje>"
git push origin main
```

Vercel detecta el push y deployea en ~30 segundos. Logs en https://vercel.com/jminterfazcos-projects/museo-textil-antigua.

**Preview URLs** automáticas en cualquier rama distinta a `main`.

### 6.3 Convenciones de commits

Imperativo en inglés, descriptivo del QUÉ, sin emojis. Ejemplos del historial:

```
Apply Figma mobile spec to Conócenos page
Render Conócenos display titles as SVG paths to fix MTA Doble blur on macOS Retina
Make mobile .visual 50% taller (220 → 330px)
Bolden home headline to EXPO -75 (desktop and mobile)
```

### 6.4 Agregar una página nueva

1. Duplicar `index.html` y renombrar.
2. Cambiar `<title>`, meta description, `<body class="...">`.
3. Si el body class no existe en `styles.css`, agregar overrides.
4. Agregar link en el nav.
5. Asegurarse de tener `<link rel="icon">` y la importación de `styles.css`.
6. `git add`, `commit`, `push`.

---

## 7. Tareas pendientes / known issues

| Tema | Estado | Acción |
|------|--------|--------|
| DNS de museotextildeantigua.com | Pendiente | Configurar A y CNAME en GoDaddy |
| Cancelar hosting de GoDaddy | Pendiente | Decisión del cliente |
| Convertir fuentes a WOFF2 | Nice to have | Reduce peso 30-40% |
| Migrar Juguetico a React | Opcional | `.jsx` es prototipo; prod es `.html` |
| Test en navegadores legacy | Pendiente | IntersectionObserver, flex no funcionan en IE |
| Analytics | Pendiente | No hay GA/Plausible; decidir tracker |
| Política de privacidad | Pendiente | Form de Juguetico recolecta email |
| Backup de Supabase | Pendiente | Configurar export periódico |

---

## 8. Contactos

| Rol | Persona / canal |
|-----|-----------------|
| Owner del repo y deploy | Juan Marín (`juancmarin` en GitHub) |
| Email del museo | `contacto@museotextildeantigua.com` |
| Diseño tipográfico (MTA) | Federico Parra |
| Distribución de Exposure VAR | [205TF](https://205.tf) |

---

## Apéndice A — Cheatsheet de variables CSS

```css
/* Paleta */
--cream:        #E8E5D9;
--cream-light:  #F1EEE4;
--black:        #000000;
--orange:       #FF6927;

/* Tipografía */
--font-display: 'MTA', 'Zilla Slab', serif;
--font-body:    'Exposure', 'Zilla Slab', serif;
--font-mosaic:  'MTA Doble', 'MTA', serif;
--expo-bold:    -100;

/* Layout */
--maxw-content:    30rem;
--conoce-margin:   5.4vw;
--border:          1.5px solid var(--black);
```

## Apéndice B — Cheatsheet del eje EXPO

| Valor | Uso |
|-------|-----|
| `EXPO 0` | Body, párrafos, labels |
| `EXPO -25` | `.lead` (subtítulos), nav links desktop |
| `EXPO -50` | Nav links en mobile |
| `EXPO -75` | Headline de home |
| `EXPO -100` | `--expo-bold`, botones, labels de form |

Valores positivos existen (más ligeros que regular) pero no se usan actualmente.
