import { Request, Response, NextFunction } from 'express';
import { sendEmail, buildNotificacionHtml } from '../services/email.service';

/**
 * POST /api/afiliados/notificar-actualizacion
 *
 * Envía notificación de actualización de datos por correo electrónico.
 * - Siempre envía al correo actual (nuevo).
 * - Si existe un correo anterior diferente, también envía a ese como medida de seguridad.
 *
 * Body esperado (NotificacionEmailPayload):
 * {
 *   nombreCompleto: string;
 *   numeroDocumento: string;
 *   correoActual: string;
 *   correoAnterior?: string;
 *   folio: string;
 *   fechaActualizacion: string;
 *   seccionesActualizadas: string[];
 * }
 */
export async function notificarActualizacion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      nombreCompleto,
      numeroDocumento,
      correoActual,
      correoAnterior,
      folio,
      fechaActualizacion,
      seccionesActualizadas,
    } = req.body;

    // ── Validación básica ──
    if (!correoActual || !nombreCompleto || !folio) {
      res.status(400).json({
        success: false,
        mensaje: 'Campos requeridos: correoActual, nombreCompleto, folio',
        destinatarios: [],
      });
      return;
    }

    const destinatarios: string[] = [];
    const resultados: { email: string; ok: boolean; previewUrl?: string }[] = [];

    // ── 1. Enviar al correo actual ──
    const htmlActual = buildNotificacionHtml({
      nombreCompleto,
      numeroDocumento,
      folio,
      fechaActualizacion,
      seccionesActualizadas: seccionesActualizadas || [],
      esCorreoAnterior: false,
    });

    const resultActual = await sendEmail({
      to: correoActual,
      subject: `FOMAG — Confirmación de actualización de datos (${folio})`,
      html: htmlActual,
    });

    destinatarios.push(correoActual);
    resultados.push({
      email: correoActual,
      ok: resultActual.success,
      previewUrl: resultActual.previewUrl,
    });

    // ── 2. Enviar al correo anterior (si difiere) ──
    if (correoAnterior && correoAnterior !== correoActual) {
      const htmlAnterior = buildNotificacionHtml({
        nombreCompleto,
        numeroDocumento,
        folio,
        fechaActualizacion,
        seccionesActualizadas: seccionesActualizadas || [],
        esCorreoAnterior: true,
      });

      const resultAnterior = await sendEmail({
        to: correoAnterior,
        subject: `FOMAG — Aviso de cambio en sus datos (${folio})`,
        html: htmlAnterior,
      });

      destinatarios.push(correoAnterior);
      resultados.push({
        email: correoAnterior,
        ok: resultAnterior.success,
        previewUrl: resultAnterior.previewUrl,
      });
    }

    console.log('📧 Notificación enviada:', JSON.stringify(resultados, null, 2));

    res.json({
      success: true,
      mensaje: `Notificación enviada a ${destinatarios.length} correo(s)`,
      destinatarios,
    });
  } catch (error) {
    console.error('❌ Error en notificarActualizacion:', error);
    next(error);
  }
}
