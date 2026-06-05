# MUTEX — Mini-sitio de pre-apertura

Sitio estático (HTML/CSS/JS vanilla) que anuncia la apertura del Museo Textil de
Antigua y captura correos para el newsletter. Réplica del diseño de Figma.

## Pantallas

| Archivo | Pantalla | Frame Figma |
|---|---|---|
| `index.html` | Inicio / hero (wordmark naranja, nav Conócenos/Síguenos) | 1:542 |
| `siguenos.html` | Formulario de email + estado de confirmación (in-place) | 1:216 / 1:248 |
| `conocenos.html` | Página de contenido "Conócenos" | 1:268 |

Flujo: el hero enlaza a **Síguenos** (formulario) y **Conócenos** (contenido).
Al enviar el formulario, `siguenos.html` reemplaza el form por el mensaje
"¡Registro exitoso!" sin recargar (vía JS).

## Estructura

```
MUTEX/
├── index.html
├── siguenos.html
├── conocenos.html
├── styles.css            # estilos compartidos + responsive
├── assets/
│   └── patron-claro.svg  # patrón de respaldo para los bloques de Conócenos
└── README.md
```

## Ver el sitio

```bash
cd MUTEX
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Assets de marca pendientes (exportar desde Figma)

Colocar en `/assets` con estos nombres exactos; las páginas los toman solas.
Mientras no existan, se muestran respaldos (patrón SVG y texto "MU TEX").

| Archivo | Qué es | Se usa en |
|---|---|---|
| `assets/motivo-textil.svg` | Motivo geométrico negro de la columna izquierda | index, siguenos |
| `assets/wordmark-naranja.svg` | Wordmark "MU TEX" mosaico **naranja** | index (hero) |
| `assets/wordmark-negro.svg` | Wordmark "MU TEX" mosaico **negro** | siguenos, conocenos |
| `assets/patron-claro.svg` | Patrón textil claro de fondo (ya incluido provisional) | conocenos |
| `assets/favicon.png` | Ícono de pestaña 512×512 (opcional) | todas |

## Tipografía

Fuentes reales embebidas (self-hosted en `assets/fonts/`):

- **Exposure** (205TF) — cuerpo, párrafos, titulares, nav, botón, footer.
  Es variable, con un eje custom **EXPO** (−100..100, default 0). NO tiene eje de
  peso (`wght`): la "negrita" se logra con `font-variation-settings: 'EXPO' -100`
  (variable `--expo-bold` en `:root`; el eje va al revés, negativo = más grueso).
  Archivos: `205TF-Exposure-ExposureVAR.ttf` (normal) y `...VARItalic.ttf` (itálica).
- **MTA** (mosaico, Federico Parra) — títulos display de Conócenos
  (`.display-title`). Variantes: Regular (en uso), Negrita, Itálica, y las
  decorativas `MTA Contorno` / `MTA Doble` (definidas por si se quieren usar).

**Zilla Slab** (Google Fonts) queda solo como **fallback** en las variables
`--font-display` / `--font-body` por si una fuente no carga.

Ajustes rápidos:
- Grosor de la "negrita" de Exposure: cambiar `--expo-bold` en `:root`.
- Peso de los títulos mosaico: en `.display-title` cambiar a `font-weight: 700`
  (usa MTA-Negrita) o a la familia `'MTA Doble'` / `'MTA Contorno'`.
- Para producción, convertir las fuentes a `.woff2` las haría más livianas.

## Conectar el formulario al newsletter (Brevo / Mailchimp)

El formulario (`siguenos.html`) está maquetado pero **no envía datos todavía**.
El input usa `name="EMAIL"`, compatible con ambos servicios.

### Brevo
1. Crear el formulario en Brevo y copiar la URL de acción.
2. En `siguenos.html`, ponerla en `action` del `<form id="newsletter-form">`,
   `method="POST"`.
3. En el `<script>` inline, quitar `e.preventDefault();` (o adaptarlo a su API/AJAX).

### Mailchimp
1. Audience → Signup forms → Embedded form. Copiar la `action`
   (`https://<dc>.list-manage.com/subscribe/post?u=...&id=...`).
2. Ponerla en `action`, `method="POST"`, mantener `name="EMAIL"`.
3. Quitar `e.preventDefault();` del script.

> Si se hace submit real (sin AJAX), el estado "¡Registro exitoso!" in-place ya no
> aplica; el servicio mostrará su propia confirmación o se puede usar una página
> de gracias. La versión actual simula el éxito sin backend.

## Redes sociales

Iconos SVG inline en el footer: Instagram, X, YouTube, TikTok, WhatsApp. Apuntan a
`#`; reemplazar por las URLs reales. (Nota: el Figma mostraba Instagram, Facebook,
WhatsApp y Mail; se priorizó la lista de 5 redes solicitada.)
```
