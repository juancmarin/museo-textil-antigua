import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/* ─── brand palette ─── */
const ACHIOTE = rgb(1.000, 0.412, 0.153); // #FF6927
const SACBE   = rgb(0.910, 0.898, 0.851); // #E8E5D9
const DARK    = rgb(0.176, 0.145, 0.125); // #2D2520
const MID     = rgb(0.420, 0.369, 0.329); // #6B5E54

const CS = 18; // SVG cell half-diagonal

function maskEmail(e) {
  const at = e.indexOf('@');
  if (at < 0) return e;
  return e.slice(0, Math.min(2, at)) + '••••@' + e.slice(at + 1);
}

async function buildPdf(grid, rows, cols, emailMasked) {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Juguetico MuTex');
  pdf.setAuthor('Museo Textil Antigua');
  pdf.setProducer('MuTex');

  const W = 595, H = 842; // A4
  const page = pdf.addPage([W, H]);

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg  = await pdf.embedFont(StandardFonts.Helvetica);

  /* Title block */
  page.drawText('MuTex  ·  MUSEO TEXTIL ANTIGUA', { x: 50, y: H - 60, size: 9, font: bold, color: ACHIOTE });
  page.drawText('Juguetico', { x: 50, y: H - 86, size: 22, font: bold, color: DARK });
  page.drawText('Tu patrón textil', { x: 50, y: H - 104, size: 11, font: reg, color: MID });

  /* Compute pattern fit area */
  const topY    = H - 130;        // top of drawing area (PDF coords)
  const botY    = 90;             // bottom of drawing area
  const availH  = topY - botY;
  const margin  = 50;
  const availW  = W - 2 * margin;
  const svgW    = (2 * cols + 1) * CS;
  const svgH    = (rows + 1) * CS;
  const scale   = Math.min(availW / svgW, availH / svgH);
  const drawW   = svgW * scale;
  const drawH   = svgH * scale;
  const ox      = (W - drawW) / 2;
  const yPad    = (availH - drawH) / 2;
  const patternTopPdfY = topY - yPad; // PDF y of SVG origin (top-left of pattern)

  /* White card background */
  page.drawRectangle({
    x: ox - 8,
    y: patternTopPdfY - drawH - 8,
    width: drawW + 16,
    height: drawH + 16,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.9, 0.89, 0.85),
    borderWidth: 0.5,
  });

  /* Diamond pattern — build two SVG paths (filled + empty) */
  let filledPath = '';
  let emptyPath  = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c * 2 * CS + CS + (r % 2 ? CS : 0)) * scale;
      const cy = (r * CS + CS) * scale;
      const h  = CS * scale;
      const p  = `M ${cx} ${cy - h} L ${cx + h} ${cy} L ${cx} ${cy + h} L ${cx - h} ${cy} Z `;
      if (grid[r][c]) filledPath += p;
      else            emptyPath  += p;
    }
  }
  const sw = Math.max(0.2, 0.5 * scale);
  page.drawSvgPath(emptyPath,  { x: ox, y: patternTopPdfY, color: SACBE,   borderColor: DARK, borderWidth: sw, borderOpacity: 0.15 });
  page.drawSvgPath(filledPath, { x: ox, y: patternTopPdfY, color: ACHIOTE, borderColor: DARK, borderWidth: sw, borderOpacity: 0.15 });

  /* Footer line */
  const dateStr = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
  page.drawText(`Diseño ${emailMasked} · ${dateStr}`, { x: 50, y: 60, size: 9, font: reg, color: MID });
  page.drawText('museo-textil-antigua.vercel.app/juguetico.html', { x: 50, y: 46, size: 8, font: reg, color: MID });

  return pdf.save();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  /* ─── parse + validate ─── */
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad_json' }); }
  }
  const { grid, email } = body ?? {};

  if (!Array.isArray(grid) || !grid.length || !Array.isArray(grid[0])) {
    return res.status(400).json({ error: 'grid_invalid' });
  }
  const rows = grid.length;
  const cols = grid[0].length;
  if (rows < 4 || rows > 24 || cols < 4 || cols > 24) {
    return res.status(400).json({ error: 'grid_size_out_of_range' });
  }
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== cols) return res.status(400).json({ error: 'grid_ragged' });
    for (const v of row) if (v !== 0 && v !== 1) return res.status(400).json({ error: 'grid_value_invalid' });
  }
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'email_invalid' });
  }

  const emailMasked = maskEmail(email);

  /* ─── Supabase write ─── */
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'backend_not_configured', detail: 'missing supabase env' });
  }
  const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data: saved, error: dbErr } = await sb
    .from('designs')
    .insert({ grid, rows, cols, email, email_masked: emailMasked })
    .select('id, grid, rows, cols, email_masked, created_at')
    .single();

  if (dbErr) {
    return res.status(500).json({ error: 'db_error', detail: dbErr.message });
  }

  /* ─── Generate PDF ─── */
  let pdfBytes;
  try {
    pdfBytes = await buildPdf(grid, rows, cols, emailMasked);
  } catch (e) {
    return res.status(200).json({ ok: true, design: saved, emailSent: false, reason: 'pdf_failed' });
  }

  /* ─── Send email ─── */
  let emailSent = false;
  let reason = null;
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddr  = process.env.RESEND_FROM || 'Juguetico MuTex <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const pdfB64 = Buffer.from(pdfBytes).toString('base64');
      const { error: mailErr } = await resend.emails.send({
        from: fromAddr,
        to: email,
        subject: 'Tu diseño Juguetico — MuTex',
        html: emailHtml(),
        attachments: [{ filename: 'juguetico-mutex.pdf', content: pdfB64 }],
      });
      if (mailErr) {
        reason = 'resend_error:' + (mailErr.message || mailErr.name || 'unknown');
      } else {
        emailSent = true;
      }
    } catch (e) {
      reason = 'resend_exception:' + (e?.message || 'unknown');
    }
  } else {
    reason = 'resend_not_configured';
  }

  return res.status(200).json({
    ok: true,
    design: saved,
    emailSent,
    reason,
  });
}

function emailHtml() {
  return `
  <!doctype html>
  <html lang="es">
    <body style="margin:0;padding:24px;background:#E8E5D9;font-family:-apple-system,system-ui,Segoe UI,sans-serif;color:#2D2520;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
        <p style="margin:0;color:#FF6927;font-weight:700;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">MuTex · Museo Textil Antigua</p>
        <h2 style="margin:8px 0 16px;font-size:22px;color:#2D2520;">Tu patrón textil está listo</h2>
        <p style="line-height:1.55;color:#6B5E54;margin:0 0 16px;">Adjuntamos el PDF vectorial de tu diseño del <strong>Juguetico</strong>. Lo podés imprimir, compartir o usar como inspiración para tu próximo proyecto textil.</p>
        <p style="line-height:1.55;color:#6B5E54;margin:0 0 24px;">Tu diseño también forma parte ya de la <a href="https://museo-textil-antigua.vercel.app/juguetico.html" style="color:#FF6927;font-weight:600;">galería colectiva</a> del museo.</p>
        <p style="margin:24px 0 0;color:#6B5E54;font-size:12px;line-height:1.5;">Gracias por participar.<br/>— Museo Textil Antigua</p>
      </div>
    </body>
  </html>`;
}
