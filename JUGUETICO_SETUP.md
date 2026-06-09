# Juguetico — Setup del backend

Tres pasos: **Supabase** (base de datos), **Resend** (envío del PDF), **Vercel** (variables de entorno). Tiempo total ~20–30 minutos.

---

## 1. Supabase (base de datos + galería)

1. Crear proyecto gratis en https://supabase.com/dashboard → **New project**.
   - Region: `East US (North Virginia)` o el más cercano a Guatemala.
   - Guardá la contraseña del proyecto (no se usa por ahora pero sirve después).
2. En el proyecto recién creado, abrir **SQL Editor** → **New query** → pegar **todo el contenido** de `supabase-schema.sql` (de la raíz del repo) → **Run**.
   - Debe aparecer "Success. No rows returned." Eso significa que la tabla `designs` y las reglas RLS quedaron creadas.
3. Ir a **Project settings → API** y copiar dos cosas:
   - `Project URL` → lo vas a usar como `SUPABASE_URL`
   - `service_role` key (sección "Project API keys", la segunda) → lo vas a usar como `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ La `service_role` key es secreta — **nunca** la pongas en HTML ni en el frontend ni la subas al repo. Sólo va en Vercel como env var.

---

## 2. Resend (envío del PDF)

1. Crear cuenta gratis en https://resend.com.
2. Ir a **API Keys** → **Create API Key** → nombre `mutex-juguetico` → permisos **Sending access** → **Add**.
   - Copiar la key. Empieza con `re_…`. Esto es `RESEND_API_KEY`.
3. **⚠️ Importante sobre el modo sandbox**: hasta que verifiques un dominio propio, Resend **sólo permite enviar al email con el que te registraste**. O sea: si te registrás con `jm@interfaz.co`, todos los visitantes guardan su diseño en la galería, pero el PDF sólo llega a `jm@interfaz.co`. Cuando estés listo para que llegue a todos:
   - Ir a **Domains** → **Add Domain** → poner el dominio del museo (ej. `mutex.gt`).
   - Agregar los registros DNS que Resend muestra (SPF + DKIM + a veces DMARC) en el proveedor donde tenés el dominio.
   - Esperar 5–60 min a que Resend verifique los registros.
   - Una vez verificado, agregar en Vercel la env var `RESEND_FROM = "Juguetico MUTEX <hola@mutex.gt>"` (cambiar por el remitente real). Sin esa var, sigue usando `onboarding@resend.dev` (modo sandbox).

---

## 3. Vercel (variables de entorno)

1. Ir al proyecto en https://vercel.com/dashboard → `museo-textil-antigua` → **Settings → Environment Variables**.
2. Agregar las siguientes, marcando **Production**, **Preview** y **Development** en todas:

   | Nombre                       | Valor                                          |
   |------------------------------|------------------------------------------------|
   | `SUPABASE_URL`               | URL del proyecto Supabase                      |
   | `SUPABASE_SERVICE_ROLE_KEY`  | service_role key de Supabase                   |
   | `RESEND_API_KEY`             | `re_…` (la key de Resend)                      |
   | `RESEND_FROM` *(opcional)*   | `"Juguetico MUTEX <hola@tu-dominio.com>"` — sólo cuando verifiques dominio. Mientras tanto, **dejala sin crear**. |

3. **Disparar redeploy** para que las env vars tomen efecto:
   - Vercel → Deployments → tres puntitos del último deploy → **Redeploy**.
   - O simplemente hacé un commit/push nuevo a `main` y Vercel desplegará solo.

---

## 4. Probar end-to-end

1. Abrir https://museo-textil-antigua.vercel.app/juguetico.html
2. Dibujar un patrón cualquiera.
3. **Guardar y enviar** → ingresar email → aceptar términos → **Enviar a mi correo**.
4. Resultado esperado:
   - El éxito aparece con mensaje "pronto llegará a tu correo" (si sandbox + email es el tuyo) o "guardado en la galería" (si Resend rebotó por sandbox + email distinto).
   - El diseño aparece en **Galería**.
   - Si era tu propio email, deberías recibir el PDF en 1–2 minutos. Revisar spam si no llega.

Si **Guardar y enviar** muestra error rojo "No pudimos guardar tu diseño":
- Vercel → Deployments → el deploy actual → **Functions** → click en `guardar` → ver logs. El error suele ser env var mal puesta o schema SQL no corrido.

---

## 5. Cosas a tener en cuenta más adelante

- **Privacidad**: la tabla `designs` guarda el email completo. Los links de **Términos y condiciones** / **Política de privacidad** en el modal apuntan a `#` — hay que escribir esos textos y enlazarlos antes de promover el sitio.
- **Moderación**: ahora todo diseño aparece automáticamente. Si aparece contenido inapropiado, el camino más rápido es entrar a Supabase → Table Editor → `designs` → borrar la fila.
- **Rate limit**: no hay anti-abuso. Si alguien automatiza envíos, agregar Upstash Ratelimit en `api/guardar.js` (5 envíos/hora por IP típicamente alcanza).
- **Backup**: Supabase free tier hace backup diario. Para una instalación de museo está bien.
