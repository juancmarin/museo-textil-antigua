# Stack técnico — MuTex + Juguetico (handoff para desarrolladores)

Guía completa de la pila técnica, servicios, recursos y decisiones del sitio del Museo Textil de Antigua y del aplicativo Juguetico. Pensada como punto de entrada para cualquier desarrollador que tome el proyecto.

> **Última actualización: 11 de noviembre de 2026** (rama `main`, commit `39405c3`).
> Los datos marcados como verificados se comprobaron ese día contra el DNS público, el sitio en vivo, el repositorio y la API de Vercel.
>
> Versión en Notion, más legible y con el detalle de operación: https://app.notion.com/p/3c9c7169d89681ab953ce0aa29599234
> El documento de junio (`38cc7169d896818ea6faf64a80b7fefe`) quedó desactualizado; si hay contradicción, manda el de noviembre.

> ⚠️ **Esta landing es transitoria.** Su único propósito es generar expectativa y capturar correos mientras se construye el sitio definitivo del museo, que **será en WordPress** y está por diseñarse. El Juguetico es una funcionalidad de ese sitio futuro, no un producto aparte: se montará encima como un panel que entra sobre la página (*slide-in*) en vez de navegar a otra URL.
>
> Consecuencia a planificar: hoy `museotextildeantigua.com` apunta a Vercel. Cuando WordPress ocupe ese dominio, el DNS cambia y esta landing deja de ser lo que se sirve ahí.

---

## 1. Vista panorámica

El proyecto vive en **un solo repositorio** y **un solo dominio**, pero internamente combina dos cosas distintas:

- **Sitio MuTex** — landing estática de 9 páginas con tipografía custom, animaciones de entrada, un formulario que captura leads y una sección de anuncios tipo blog.
- **Juguetico** — aplicativo interactivo donde el usuario diseña su propio patrón textil tipo huipil y se lo envía por correo en PDF. Vive en `juguetico.html`. **No es público todavía**: ninguna página del sitio lo enlaza.

| Cosa | URL |
|------|-----|
| Repo | https://github.com/juancmarin/museo-textil-antigua |
| Producción | https://museotextildeantigua.com |
| URL alterna | https://museo-textil-antigua.vercel.app |

~5.200 líneas de código entre HTML, CSS y JS. Hay un `package.json`, pero solo para las dependencias de las Vercel Functions del Juguetico: **el sitio no tiene build step**.

---

## 2. MuTex — Sitio estático

### 2.1 Stack

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Markup | HTML5 semántico (9 páginas) | Sitio de pre-apertura con poca interacción |
| Estilos | CSS3 puro, un solo `styles.css` (~1.970 líneas) | Cero build tooling |
| Interacción | JavaScript vanilla, sin framework | IntersectionObserver, fetch, FormData, DOM |
| Tipografía dinámica | Variable fonts + eje custom | `font-variation-settings: 'EXPO' -100` |
| Animaciones | CSS keyframes + IntersectionObserver (`assets/anim.js`) | Estilo Framer Motion sin la librería |
| SVG glyph rendering | `opentype.js` CDN + `assets/glyphify.js` | Convierte texto MTA Doble a SVG paths (anti-aliasing macOS Retina) |
| Analytics | Google Tag Manager (`assets/analytics.js`) | Ver 2.9 |

**Sin build step:** lo que escribes es lo que se sirve. Sin Webpack, Vite, Babel, npm install.

### 2.2 Estructura del repo

```
MUTEX/
├── index.html                          # Home (wordmark + tagline + tarjeta del último anuncio)
├── conocenos.html                      # Página de información del museo
├── siguenos.html                       # Formulario de captura de leads
├── anuncios.html                       # Listado del blog
├── anuncio-germina-un-museo.html       # Detalle publicado
├── anuncio-practica-viva.html          # ) Detalles preparados pero
├── anuncio-cubrirse-para-comparecer.html  # ) ocultos en el listado:
├── anuncio-que-es-un-huipil.html       # ) se publican uno por semana
├── anuncio-antes-que-los-textiles.html # ) quitando el atributo hidden
├── juguetico.html                      # Aplicativo interactivo (no enlazado todavía)
├── styles.css                          # Estilos compartidos + responsive
├── vercel.json                          # Redirecciones + cabecera CSP del Juguetico
├── package.json                         # Solo para las Vercel Functions
├── supabase-schema.sql                  # Esquema de la tabla designs
├── api/
│   ├── guardar.js                       # POST: guarda el diseño y manda el PDF
│   └── galeria.js                       # GET: últimos diseños públicos
├── assets/
│   ├── fonts/                           # 7 archivos de tipografías custom (2,6 MB)
│   ├── analytics.js                     # Contenedor de Google Tag Manager
│   ├── anim.js                          # IntersectionObserver para fade-ins
│   ├── glyphify.js                      # Renderiza MTA Doble como SVG paths
│   ├── wordmark-naranja.svg             # OJO: el nombre es heredado, hoy es azul
│   ├── monograma.svg                    # La M del menú
│   ├── logo-mutex-siguenos.svg
│   ├── motivo-textil.gif                # 2.1 MB — patrón animado
│   ├── og-image.jpg                     # Previsualización al compartir (1200x630)
│   ├── icon-arrow.svg
│   ├── patron_conocenos_1.svg / _2.svg / patron-claro.svg
│   ├── favicon.ico / .svg / favicon-source.svg
│   └── apple-touch-icon.png / icon-192.png / icon-512.png
├── legacy/                              # Versiones viejas, no se sirven
├── mockup/                              # Prototipos, no se sirven
├── JUGUETICO_SETUP.md                   # Puesta en marcha de Supabase y Resend
├── README.md
└── STACK.md                             # Este documento
```

### 2.3 Tipografía (lo más singular del proyecto)

El sitio usa **dos familias custom, ambas embebidas localmente** (no Google Fonts ni Adobe Fonts):

#### Exposure (205TF) — cuerpo, nav, botones, headlines

- Fuente **variable** con eje custom `EXPO` que va de **-100 a 100** (default 0).
- **No tiene eje `wght` tradicional.** Para "negrita" se usa:

```css
font-variation-settings: 'EXPO' -100;  /* máximo bold: botones, labels */
font-variation-settings: 'EXPO' -50;   /* nav móvil */
font-variation-settings: 'EXPO' -40;   /* títulos y subtítulos de anuncios */
font-variation-settings: 'EXPO' -25;   /* leads, titular del home */
font-variation-settings: 'EXPO' 0;     /* regular (default) */
```

**El eje está invertido:** valores **negativos = más grueso**. Documentado con la variable CSS `--expo-bold` en `:root`.

Archivos: `205TF-Exposure-ExposureVAR.ttf` (1,2 MB) y `205TF-Exposure-ExposureVARItalic.ttf` (1,3 MB).

#### MTA — títulos display

Familia diseñada por **Federico Parra** específicamente para el museo. Cinco variantes:

- `MTA-Regular.otf` (17 KB)
- `MTA-Negrita.otf` (8.1 KB)
- `MTA-Itálica.otf` (18 KB)
- `MTA-Contorno.otf` (13 KB) — decorativa, no usada
- `MTA-Doble.otf` (13 KB) — la principal: cada letra es una malla de rombos

**MTA Doble tiene un problema en macOS Retina:** el anti-aliasing emborrona los rombos chicos. Solución: `glyphify.js` carga la fuente con **opentype.js** y rinde los títulos como `<svg>` con paths reales. Elementos con `data-glyphify` reciben este tratamiento automáticamente.

> **Gotcha de `glyphify.js`:** fija el `width` y el `height` del SVG en el momento de renderizar. Cambiar el `font-size` por CSS después de que cargó **no** regenera el dibujo. Para medir un título hay que recargar la página, no editar en caliente desde DevTools.

> **Gotcha de `max-width`:** poner `max-width` en `.display-title` escala los SVG hacia abajo y deja los títulos de distinto tamaño entre sí. Hay un comentario en `styles.css` advirtiéndolo.

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

### 2.5 Formulario de captura (Síguenos)

**Servicio:** [Web3Forms](https://web3forms.com)

| Detalle | Valor |
|---------|-------|
| Endpoint | `https://api.web3forms.com/submit` |
| Plan | Free (250 envíos / mes) |
| Destinatario | `contacto@museotextildeantigua.com` |
| Campos | Nombre, Apellido, Email |

**Acceso al panel**

| Detalle | Valor |
|---------|-------|
| Panel | https://app.web3forms.com |
| Titular de la cuenta | El museo |
| Usuario | `contacto@museotextildeantigua.com` |
| Contraseña | **No se guarda aquí.** Ver abajo. |
| Nombre del formulario | MuTex – Síguenos |

> ⚠️ **Este repositorio es público.** Nunca escribir contraseñas, tokens ni claves privadas en este archivo ni en ningún otro del repo: quedarían publicadas en internet y, aunque se borren después, seguirían accesibles en el historial de git.
>
> La contraseña de esta cuenta va en el gestor de contraseñas del museo, o compartida por un canal seguro. La única credencial que sí vive en el código es la `access_key`, y es pública por diseño.

Campos ocultos en el `<form>`:
- `access_key` — identifica el formulario. Es **pública a propósito**: solo permite enviar a este formulario, no da acceso a nada más.
- `subject` y `from_name` — controlan el asunto y el remitente del aviso.
- `botcheck` — honeypot antispam de Web3Forms. Va oculto; si un bot lo marca, el envío se descarta.

Lógica del submit en `siguenos.html` (script inline):
1. Valida los 3 campos con `checkValidity()` nativo.
2. Convierte el `FormData` a JSON y hace `fetch` con `Content-Type: application/json`. La API espera JSON, no `FormData`.
3. Botón a `ENVIANDO…` durante la espera.
4. Verifica `res.ok` **y** `data.success === true`. La API puede responder 200 con `success: false`; sin esa segunda comprobación se mostraría éxito en un envío fallido.
5. Si OK → vista "¡Registro exitoso! Pronto recibirás más información."
6. Si falla → mensaje de error, reactiva el botón.

Cambiar el destinatario: se configura en el panel de Web3Forms, no en el HTML.

El formulario **no pasa por Supabase ni por las funciones de Vercel**, así que la captura de correos sigue funcionando aunque el backend del Juguetico esté caído.

### 2.6 Responsive

Mobile-first con un solo breakpoint principal: `@media (max-width: 768px)`.

Detalles específicos del diseño, fáciles de romper sin contexto:

- **Menú móvil:** una sola fila, monograma a la izquierda y los tres enlaces repartidos con `space-between`, mismo sitio en todas las páginas.
- **El GIF del motivo se oculta en móvil** en Conócenos, Anuncios y los detalles de anuncio. Solo se ve en Home y Síguenos.
- **Motivo textil en Home y Síguenos:** ocupa la fila `1fr` del grid, con un alto mínimo proporcional al ancho (`min(123.3vw, 520px)`).
- **Home:** el wordmark ocupa el ancho del bloque y el subtítulo escala con él, para mantener la proporción del diseño en cualquier ancho de teléfono. Ver los comentarios en `styles.css`.
- **Tarjeta de anuncios del Home:** 90vw, centrada con márgenes negativos y no con `align-items`, porque es más ancha que su contenedor.

> **Gotcha de iOS Safari:** descarta las declaraciones de `margin` que mezclan `%` con `vw` dentro de un `calc()`. Por eso los márgenes de la tarjeta usan `vw` y `px` solamente. Costó una sesión entera encontrarlo.

### 2.7 Anti-copia de assets

Patrones SVG y GIF del motivo textil:
```css
pointer-events: none;
user-select: none;
-webkit-user-drag: none;
-webkit-touch-callout: none;
```
No previene a un usuario decidido (Network tab) pero bloquea drag, right-click → save y selección casual.

### 2.8 Anuncios (el blog)

`anuncios.html` lista las entradas y cada una tiene su página de detalle. **Solo una está publicada**; las otras cuatro llevan el atributo `hidden` en su `<article>` y se irán soltando semana a semana. Para publicar una basta con borrar esa palabra: la página de detalle ya existe.

> Tres de esas páginas de detalle llevan **solo el extracto de la tarjeta**, no el artículo completo. Están marcadas con un comentario `PENDIENTE` en el HTML. Antes de publicarlas hay que pegarles el copy real.

La tarjeta del Home y la tarjeta del listado **repiten el mismo texto a mano**: título, antetítulo, extracto y fecha. Si cambia uno, hay que cambiar los dos. Hay comentarios en ambos archivos recordándolo.

Toda la tarjeta es clicable, con el patrón *stretched link*: `position: relative` en la tarjeta y un `::after` con `inset: 0` sobre el enlace de "Leer más". Así no hay HTML inválido por anidar elementos interactivos.

### 2.9 Analytics

**Google Tag Manager**, contenedor `GTM-5QXZCPSV`, instalado el 11 de noviembre de 2026.

> ⚠️ **Está instalado pero todavía no mide nada.** Falta crear la etiqueta de GA4 dentro del contenedor y publicarlo, y eso se hace en tagmanager.google.com, no aquí.

El ID vive **solo** en `assets/analytics.js`, y cada página carga ese archivo. El snippet de Google se pega normalmente en el `<head>` de cada página, pero son nueve `<head>` escritos a mano y el ID acabaría repetido en nueve sitios. Funciona igual porque `dataLayer` es una cola: el archivo la inicializa antes de pedir `gtm.js`. Si se deja el ID vacío, el archivo no descarga nada ni pone cookies.

`juguetico.html` **no** lleva la etiqueta: es el embebido que irá dentro de WordPress, y medirlo mezclaría vistas de iframe con las del sitio.

> ⚠️ **No hay aviso de cookies.** GA4 pone cookies y el RGPD exige consentimiento previo a los visitantes de la UE. Es una decisión pendiente del cliente, de la mano con la política de privacidad.

### 2.10 Cache busting de CSS

Las nueve páginas enlazan la hoja como `styles.css?v=NN`. **Cada vez que se publique un cambio de estilos hay que subir ese número en las nueve**, o los navegadores se quedan con la versión vieja. Hoy va por `v=52`. Sin esto, un cambio de CSS puede tardar días en verse y parecer que no se aplicó.

---

## 3. Juguetico — Aplicativo interactivo

### 3.1 Qué es

El usuario dibuja un patrón textil en un grid de rombos (estilo huipil), lo guarda en la galería colectiva del museo, y recibe el diseño por correo en formato PDF.

**No es público todavía.** La página existe y responde, pero ninguna parte del sitio enlaza a ella.

### 3.2 Frontend

**`juguetico.html`** (~1.370 líneas) — HTML/CSS/JS vanilla con estilos inline en el `<style>` del head. Usa `Instrument Sans` de Google Fonts. Hace `fetch` a `/api/guardar` y `/api/galeria`.

> El prototipo paralelo en React (`juguetico.jsx`) que mencionaban versiones anteriores de este documento **ya no está en el repo**.

### 3.3 Backend de Juguetico

Montado como Vercel Functions:

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/guardar` | POST | Recibe el diseño + email + términos. Guarda en Supabase y dispara email con PDF vía Resend. |
| `/api/galeria` | GET | Devuelve los últimos N diseños públicos para la galería. |

> 🔴 **`/api/galeria` está roto.** Verificado el 11 nov 2026: devuelve `500` con `{"error":"db_error","detail":"TypeError: fetch failed"}`, o sea que no alcanza Supabase. No bloquea la landing, pero **hay que resolverlo antes de publicar el Juguetico**.
>
> `/api/guardar` responde `405` a GET, así que la función está desplegada y viva. No se probó el POST para no crear registros ni disparar correos reales, así que **no está verificado** que la ruta completa de guardado y envío funcione; dado que `galeria` no alcanza Supabase, lo más probable es que tampoco.

**Runtime:** Node 22. Está fijado en dos sitios que **tienen que coincidir**: `engines.node: "22.x"` en `package.json` y el ajuste del proyecto en Vercel. Estuvieron desalineados (Vercel en 24.x) hasta el 11 de noviembre de 2026, cuando se bajó el ajuste de Vercel a 22.x para que el panel refleje lo que de verdad corre: `engines` tiene precedencia, así que las funciones ya venían corriendo en 22.

> Node 22 entra en mantenimiento y se queda sin soporte en abril de 2027. Antes de esa fecha hay que subir los dos valores a la vez, y probar el Juguetico después: es el único código que corre en Node.

**Persistencia:** [Supabase](https://supabase.com)
- Tabla `designs` con `id`, `grid` (JSON con matriz binaria), `email`, `ts`, etc. El esquema está en `supabase-schema.sql`.
- **Importante**: la opción `Expose tables` está desactivada en Supabase, por lo que cada tabla nueva necesita un `GRANT` explícito a `service_role`. Ver commit `5a58e8e`.

**Email:** [Resend](https://resend.com) — `/api/guardar` envía el PDF del diseño como attachment.

### 3.4 Lógica del editor

Estado:
- `grid` — matriz de booleanos (1 = pintado, 0 = vacío).
- `tool` — `"draw" | "erase"`.
- `history` — pila de los últimos 20 estados (undo limitado).
- `view` — `"editor" | "preview" | "gallery" | "success"`.
- `gallery` — diseños cargados al montar.

Funciones clave:
- `cellCenter(r, c)` — coordenadas del centro de un rombo en el SVG (offset por fila para el patrón hexagonal).
- `hitTest(mx, my, rows, cols)` — distancia Manhattan normalizada para detectar clicks en un rombo.
- `mirrorH()` / `mirrorV()` — flip del patrón completo. **El grid está escalonado**, así que el espejo no es un simple invertir de columnas: usa una fórmula que tiene en cuenta la paridad de la fila.
- `resizeGrid(r, c)` — redimensiona preservando contenido (4 a 24 filas/columnas).
- `maskEmail("perezpepito@gmail.com")` → `"pe••••@gmail.com"` — privacidad en la galería pública.

**Moderación:** todo diseño aparece automáticamente en la galería. Para quitar uno: Supabase → Table Editor → `designs` → borrar la fila.

### 3.5 Paleta de Juguetico

Distinta a la del sitio principal (más cálida, terrosa):

```
--achiote:  #FF6927   (naranja)
--sacbe:    #E8E5D9   (cream, mismo que el sitio)
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
| **Web3Forms** | Backend del form de Síguenos | Cuenta del museo (`contacto@museotextildeantigua.com`), plan free 250/mes |
| **Supabase** | Base de datos de Juguetico (`designs`) | URL y service_role key en env vars de Vercel |
| **Resend** | Envío de email con PDF (Juguetico) | API key en env vars de Vercel |
| **GoDaddy** | Registro del dominio y DNS | `museotextildeantigua.com`, nameservers `ns41/ns42.domaincontrol.com` |
| **Google Workspace** | Correo del museo | MX del dominio |
| **Google Tag Manager** | Analytics | Contenedor `GTM-5QXZCPSV` |
| **Google Fonts** | Solo fallback (Zilla Slab, Instrument Sans) | CDN público |

### 4.1 Variables de entorno (Vercel)

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...    # NO la anon key — necesita service_role
RESEND_API_KEY=re_...
RESEND_FROM=...                  # opcional, ver abajo
```

**Si una función falla con 500:** revisar que estén seteadas en Production Y Preview.

**Sobre `RESEND_FROM`:** si no está seteada, `api/guardar.js` usa `onboarding@resend.dev`, que es el modo sandbox de Resend y **solo entrega al correo con el que se registró la cuenta**. Al 30 de agosto de 2026 no estaba configurada. No se ha podido verificar desde entonces: la API de Vercel deniega con 403 la lectura de variables de entorno con el token disponible, así que **hay que mirarlo en el panel**.

### 4.2 DNS (en producción, verificado el 11 nov 2026)

El DNS se administra **en GoDaddy, no en Vercel**.

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `@` | `216.198.79.1` |
| CNAME | `www` | `708ec45051ad7785.vercel-dns-017.com.` |
| MX | `@` | `1 smtp.google.com.` |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` |
| TXT | `@` | `google-site-verification=...` |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net` |
| TXT | `google._domainkey` | DKIM de Google Workspace |

> ⚠️ **Los valores de Vercel hay que leerlos del panel, no de su documentación.** El apex es `216.198.79.1`; el `76.76.21.21` de los docs quedó como legacy. El CNAME de `www` es un **hash único por dominio**, no un valor genérico.

> 🚨 **Nunca mover los nameservers a Vercel** sin recrear antes MX, SPF, DKIM y DMARC. Se cae el correo del museo.

- **SSL:** Let's Encrypt con renovación automática de Vercel, que funciona. El certificado vigente se emitió el 29 oct 2026 y vence el 27 ene 2027.
- **Subdominios:** no existe ninguno. Se consultaron diez nombres probables (`staging`, `pruebas`, `test`, `dev`, `wp`, `juguetico`, `blog`, `cdn`, `mail`, `autodiscover`) y ninguno tiene registro. **Eso no prueba que la zona esté vacía**: una zona DNS no se puede enumerar desde fuera, solo consultar nombre por nombre.
- **No hay registro CAA.**

### 4.3 `vercel.json`

Dos cosas:

- **Redirección 301** de `/anuncio-nace-un-museo.html` a `/anuncio-germina-un-museo.html`. La entrada se renombró el 3 de noviembre de 2026 y la ruta vieja ya estaba publicada.
- **Cabecera CSP** sobre `/juguetico.html` con `frame-ancestors 'self' https://museotextildeantigua.com https://*.vercel.app`. **No borrar:** es el mecanismo con el que el slide-in cargará el Juguetico dentro del sitio de WordPress.

> `vercel.json` se valida contra un esquema y **no admite claves fuera de las suyas**. Una clave `comment` dentro de una redirección tumba el build. Los porqués van en comentarios del HTML, no ahí.

---

## 5. Decisiones técnicas (con el porqué)

### 5.1 Sin framework para el sitio principal
Páginas con baja interactividad y sin contenido dinámico. Un framework agrega build, bundle JS, routing y complejidad. <100 ms de carga. Cualquier dev con HTML/CSS básico lo mantiene.
**Cuándo cambiarlo:** cuando el blog crezca lo suficiente como para que duplicar el `<head>` a mano se vuelva insostenible. Hoy ya hay nueve copias; ese es el principal costo del enfoque.

### 5.2 Variable fonts con eje custom
1 archivo TTF cubre todo el rango de pesos. Antes serían 5 woff2 separados. Declaraciones `font-variation-settings: 'EXPO' -25` documentan la intención.
**Trade-off:** TTF es 30-40% más pesado que WOFF2. Los dos de Exposure suman 2,5 MB de los 2,6 MB de la carpeta. Convertir es nice-to-have.

### 5.3 SVG paths para MTA Doble (`glyphify.js`)
MTA Doble se emborrona en Retina por el anti-aliasing tipográfico. SVG paths no reciben ese tratamiento → rombos crispy.
**Trade-off:** títulos no seleccionables (`aria-label` mantiene accesibilidad).

### 5.4 Web3Forms en vez de backend propio
250 leads/mes free, antispam incluido, sin servidor ni base de datos que mantener. La cuenta está a nombre del museo, así que los datos son suyos desde el día uno.
**Cuándo migrar:** doble opt-in (Brevo) | unificar con campañas (Mailchimp) | volumen mayor a 250/mes.

### 5.5 Vercel sobre el hosting de GoDaddy
Preview URLs por rama, edge CDN, SSL auto, deploy en 30 seg, Vercel Functions para el backend de Juguetico. GoDaddy obliga FTP, no tiene Functions.

### 5.6 Supabase para Juguetico
Plan free generoso (500 MB, 50k MAU). Postgres real → SQL analytics en el futuro.
**Gotcha:** `Expose tables` apagado por seguridad. Tablas nuevas requieren `GRANT SELECT, INSERT ON public.<tabla> TO service_role;` manual desde el SQL Editor.

### 5.7 Resend para email
API minimal, soporte de attachments (necesario para el PDF), 100 emails/día gratis.

### 5.8 Animaciones con IntersectionObserver
Sin React = Framer Motion no aplica. IntersectionObserver es nativo, soporte universal. Atributos `data-anim` se aplican declarativamente.

### 5.9 El ID de analytics en un archivo aparte
Ver 2.9. La razón de fondo es la misma que hace molesto el cache busting: nueve `<head>` escritos a mano. Todo lo que se pueda centralizar en un archivo, mejor.

---

## 6. Workflow de desarrollo

### 6.1 Correr localmente

```bash
python3 -m http.server 8123
```

Abrir http://localhost:8123. No requiere instalar nada.

> **Ojo con la caché del navegador.** Un `styles.css` viejo en caché puede hacer creer que un cambio no se aplicó. Si algo no se ve, comprobar el tamaño del archivo que sirve el servidor contra el que cargó el navegador antes de tocar el CSS.

> **Juguetico con backend funcional en local:** correr `vercel dev` (requiere `npm i -g vercel` y `vercel link` previo). El servidor de Python **no** ejecuta las funciones de `/api`.

### 6.2 Deployar

```bash
git add <archivos>
git commit -m "<mensaje>"
git push origin main
```

Vercel detecta el push y deployea en ~30 segundos. Logs en https://vercel.com/jminterfazcos-projects/museo-textil-antigua.

**Preview URLs** automáticas en cualquier rama distinta a `main`. Están **protegidas con SSO de Vercel** (`all_except_custom_domains`): solo las abre quien tenga acceso al team. Para enseñarle una al cliente hay que desactivar esa protección o cambiarla por contraseña.

### 6.3 Convenciones de commits

Imperativo, descriptivo del QUÉ, sin emojis. El historial reciente está en español; el viejo en inglés.

### 6.4 Agregar una página nueva

1. Duplicar la página más parecida y renombrar.
2. Cambiar `<title>`, meta description, `<body class="...">`.
3. Si el body class no existe en `styles.css`, agregar overrides.
4. Agregar el link en el nav de **todas** las páginas.
5. Comprobar que tenga `<link rel="icon">`, el `styles.css?v=NN` con el número actual y el `<script async src="assets/analytics.js">`.
6. `git add`, `commit`, `push`.

Para una entrada de blog nueva, el camino corto es duplicar `anuncio-germina-un-museo.html`, que es la plantilla de referencia, y añadir su `<article class="anuncio-item">` en `anuncios.html` y la tarjeta en el Home si va a ser la destacada.

---

## 7. Tareas pendientes / known issues

Revisadas una por una el 11 de noviembre de 2026.

| Tema | Estado | Acción |
|------|--------|--------|
| `api/galeria` devuelve 500 | **Roto, verificado** | Supabase inalcanzable. Resolver **antes** de publicar el Juguetico |
| Etiqueta de GA4 | **Pendiente** | El contenedor de GTM está puesto, pero no mide nada hasta crear la etiqueta dentro y publicarlo |
| Aviso de cookies | **Pendiente** | Nuevo desde que hay analytics. Decisión del cliente |
| Política de privacidad | **Pendiente** | Hace falta por el formulario y ahora también por las cookies. No existe la página |
| Copy de 3 páginas de anuncio | **Pendiente** | Llevan solo el extracto; marcadas con `PENDIENTE` en el HTML |
| Subir Node antes de abril de 2027 | Pendiente, sin prisa | Node 22 pierde soporte entonces. Subir `engines.node` y el ajuste de Vercel a la vez, y probar el Juguetico |
| Confirmar `RESEND_FROM` | **Sin verificar** | Mirar el panel de Vercel |
| Cuota de Web3Forms | **Sin verificar** | 250/mes. Revisar antes de una campaña de lanzamiento |
| Convertir fuentes a WOFF2 | Nice to have | Reduce peso 30-40% |
| `rel=canonical` y `www` | Opcional | Ninguna página tiene `canonical`; `www` encadena dos redirecciones |
| Cancelar hosting de GoDaddy | Decisión del cliente | Ver abajo |
| Backup de Supabase | Pendiente | Configurar export periódico |
| Transición a WordPress | **Pendiente, es lo siguiente** | Ver sección 8 |

---

## 8. Lo que no se puede responder desde el código

Para planificar el sitio definitivo en WordPress hacen falta datos que **no están en el repo ni se pueden consultar desde fuera**. Quedan aquí para que nadie los dé por supuestos:

| Pregunta | Dónde se responde |
|----------|-------------------|
| Cómo se entró a GoDaddy en agosto para cambiar el DNS, y si ese acceso sigue vigente | Preguntarle a quien lo hizo. **No hay rastro en el historial de git**: el cambio se hizo en el panel |
| Qué producto de hosting tiene contratado el museo en GoDaddy, y el nombre del plan | Panel de GoDaddy |
| Si ya hay un WordPress instalado ahí | Panel de GoDaddy |
| Si el plan incluye entorno de staging | Panel de GoDaddy |
| Si el proyecto de Vercel sigue en plan Hobby | Panel de Vercel. La API no devuelve el plan |
| Si `RESEND_FROM` está configurada | Panel de Vercel |
| La lista completa de subdominios del dominio | Panel de GoDaddy |

Lo que sí está verificado y condiciona el plan:

- **No existe ningún subdominio**, así que `staging.` o `pruebas.` está libre.
- **Los nameservers son de GoDaddy**, así que todo subdominio nuevo se crea allí.
- **El correo del museo cuelga del mismo dominio.** Cualquier movimiento de DNS tiene que dejar MX y TXT intactos.
- **Del slide-in del Juguetico no hay nada construido**, solo la regla CSP de `vercel.json`.
- **Dominios conectados al proyecto de Vercel:** el apex, `www` y tres alias `.vercel.app`.

---

## 9. Contactos

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
--azul:         #849CAE;   /* wordmark del Home y fondo del motivo */
--azul-label:   #718E9E;   /* etiquetas de la tarjeta de anuncios */
--azul-form:    #86A6B7;   /* formulario de Síguenos */
--card-bg:      #F8F7F1;

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

> Los tres azules son **tonos distintos a propósito**, según los diseños entregados. No unificarlos sin consultar.

## Apéndice B — Cheatsheet del eje EXPO

| Valor | Uso |
|-------|-----|
| `EXPO 0` | Body, párrafos, labels, nav |
| `EXPO -25` | `.lead` (subtítulos) y titular del home |
| `EXPO -40` | Títulos y subtítulos de las páginas de anuncio |
| `EXPO -50` | Nav links en mobile |
| `EXPO -100` | `--expo-bold`, botones, labels de form |

Valores positivos existen (más ligeros que regular) pero no se usan actualmente.
