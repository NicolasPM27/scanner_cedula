import nodemailer from 'nodemailer';

/**
 * Servicio de email para FOMAG.
 *
 * En desarrollo usa una cuenta Ethereal (mock SMTP) que permite
 * ver los correos enviados en https://ethereal.email sin enviarlos realmente.
 *
 * En producción se configura con las variables de entorno:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

// ── Interfaz ─────────────────────────────────────────
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

// ── Singleton del transporter ────────────────────────
let transporter: nodemailer.Transporter | null = null;

/**
 * Inicializa el transporter SMTP.
 * En dev: crea una cuenta Ethereal automáticamente.
 * En prod: usa variables de entorno.
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && process.env.SMTP_HOST) {
    // ── Producción: SMTP real ──
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: (process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  } else {
    // ── Desarrollo: Ethereal (mock) ──
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Ethereal test account created:');
    console.log(`   User: ${testAccount.user}`);
    console.log(`   Pass: ${testAccount.pass}`);
    console.log(`   Preview: https://ethereal.email`);

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return transporter;
}

/**
 * Envía un correo electrónico.
 */
export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  try {
    const smtp = await getTransporter();
    const from = process.env.SMTP_FROM || '"FOMAG - Actualización de Datos" <noreply@fomag.gov.co>';

    const info = await smtp.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    // En desarrollo, obtener URL de preview de Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

    if (previewUrl) {
      console.log(`📧 Preview URL: ${previewUrl}`);
    }

    console.log(`📧 Email sent: ${info.messageId} → ${options.to}`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: typeof previewUrl === 'string' ? previewUrl : undefined,
    };
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Genera el HTML del correo de notificación de actualización.
 */
export function buildNotificacionHtml(data: {
  nombreCompleto: string;
  numeroDocumento: string;
  folio: string;
  fechaActualizacion: string;
  seccionesActualizadas: string[];
  esCorreoAnterior?: boolean;
}): string {
  const seccionesHtml = data.seccionesActualizadas
    .map(
      (s) => `
      <tr>
        <td style="padding: 6px 12px; font-size: 14px; color: #334155;">
          <span style="color: #10B981; margin-right: 8px;">✓</span>${s}
        </td>
      </tr>`
    )
    .join('');

  const avisoCorreoAnterior = data.esCorreoAnterior
    ? `<p style="background: #FEF3C7; color: #92400E; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin: 16px 0;">
         <strong>Nota:</strong> Este correo fue enviado a su dirección de correo electrónico anterior
         como medida de seguridad. Si usted no realizó esta actualización, por favor comuníquese
         inmediatamente con FOMAG.
       </p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" style="background-color: #F8FAFC; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" style="max-width: 600px; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0 0 4px; font-size: 22px; font-weight: 700;">FOMAG</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 0; font-size: 12px; letter-spacing: 0.5px;">
                Fondo Nacional de Prestaciones Sociales del Magisterio
              </p>
            </td>
          </tr>

          <!-- Success badge -->
          <tr>
            <td style="padding: 24px 24px 0;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="background: #ECFDF5; border-radius: 12px; padding: 16px; text-align: center;">
                    <span style="font-size: 36px;">✅</span>
                    <h2 style="margin: 8px 0 0; font-size: 18px; color: #065F46;">
                      Actualización de Datos Exitosa
                    </h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px;">
              <p style="color: #1E293B; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                Estimado(a) <strong>${data.nombreCompleto}</strong>,
              </p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                Le informamos que sus datos han sido actualizados exitosamente en el sistema FOMAG.
                A continuación encontrará el resumen de la actualización:
              </p>

              ${avisoCorreoAnterior}

              <!-- Details card -->
              <table role="presentation" width="100%" style="background: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; margin: 16px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #64748B;">Documento:</td>
                        <td style="padding: 4px 0; font-size: 13px; color: #1E293B; font-weight: 600; text-align: right;">
                          ${data.numeroDocumento}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #64748B;">Folio:</td>
                        <td style="padding: 4px 0; font-size: 13px; color: #4F46E5; font-weight: 600; text-align: right;">
                          ${data.folio}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #64748B;">Fecha:</td>
                        <td style="padding: 4px 0; font-size: 13px; color: #1E293B; text-align: right;">
                          ${data.fechaActualizacion}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Updated sections -->
              <p style="font-size: 14px; color: #1E293B; font-weight: 600; margin: 20px 0 8px;">
                Secciones actualizadas:
              </p>
              <table role="presentation" width="100%" style="background: #F0FDF4; border-radius: 8px;">
                ${seccionesHtml}
              </table>

              <!-- Security note -->
              <table role="presentation" width="100%" style="margin-top: 24px;">
                <tr>
                  <td style="background: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 0 8px 8px 0; padding: 12px 16px;">
                    <p style="margin: 0; font-size: 12px; color: #1E40AF; line-height: 1.5;">
                      <strong>🔒 Seguridad:</strong> Si usted no realizó esta actualización,
                      por favor comuníquese de inmediato con la línea de atención FOMAG
                      al <strong>601-7561436</strong> o escriba a
                      <a href="mailto:soporte@fomag.gov.co" style="color: #4F46E5;">soporte@fomag.gov.co</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #F1F5F9; padding: 20px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #94A3B8;">
                Este es un correo automático, por favor no responda a este mensaje.
              </p>
              <p style="margin: 0; font-size: 10px; color: #CBD5E1;">
                Protegido bajo la Ley 1581 de 2012 (Protección de Datos Personales)
              </p>
              <p style="margin: 8px 0 0; font-size: 10px; color: #CBD5E1;">
                © ${new Date().getFullYear()} FOMAG — Todos los derechos reservados
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
