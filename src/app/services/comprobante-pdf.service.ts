import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { DatosAfiliado } from '../models/afiliado.model';

/**
 * Servicio para generar el comprobante PDF de actualización de datos.
 *
 * Genera un documento formal con el branding FOMAG que incluye:
 * - Encabezado institucional
 * - Datos personales del afiliado
 * - Información de contacto actualizada
 * - Información sociodemográfica
 * - Información laboral (si aplica)
 * - Beneficiarios actualizados
 * - Folio y marca de tiempo
 * - Pie de página legal
 */
@Injectable({
  providedIn: 'root',
})
export class ComprobantePdfService {
  // ── Constantes de diseño ────────────────────────────
  private readonly PAGE_WIDTH = 210;
  private readonly PAGE_HEIGHT = 297;
  private readonly MARGIN_X = 20;
  private readonly CONTENT_WIDTH = 170; // PAGE_WIDTH - 2 * MARGIN_X
  private readonly LINE_HEIGHT = 6;

  // Paleta FOMAG (alineada con variables.scss)
  private readonly COLOR_PRIMARY: [number, number, number] = [79, 70, 229]; // #4F46E5
  private readonly COLOR_TEXT: [number, number, number] = [30, 41, 59]; // #1E293B
  private readonly COLOR_MUTED: [number, number, number] = [100, 116, 139]; // #64748B
  private readonly COLOR_SUCCESS: [number, number, number] = [16, 185, 129]; // #10B981
  private readonly COLOR_LIGHT_BG: [number, number, number] = [241, 245, 249]; // #F1F5F9
  private readonly COLOR_WHITE: [number, number, number] = [255, 255, 255];
  private readonly COLOR_BORDER: [number, number, number] = [226, 232, 240]; // #E2E8F0

  /**
   * Genera y descarga el comprobante PDF
   */
  async generarComprobante(
    afiliado: DatosAfiliado,
    folio: string,
    fecha: string
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 0;

    // ── Encabezado ──────────────────────────────────
    y = this.dibujarEncabezado(doc, folio);

    // ── Marca decorativa ────────────────────────────
    y = this.dibujarBannerExito(doc, y);

    // ── Datos personales ────────────────────────────
    y = this.dibujarSeccion(doc, y, 'Datos Personales', [
      ['Nombre completo', this.getNombreCompleto(afiliado)],
      ['Número de cédula', this.formatCedula(afiliado.numeroDocumento)],
      ['Fecha de nacimiento', this.formatFecha(afiliado.fechaNacimiento)],
      ['Género', afiliado.genero === 'M' ? 'Masculino' : 'Femenino'],
    ]);

    // ── Información de contacto ─────────────────────
    if (afiliado.contacto) {
      y = this.dibujarSeccion(doc, y, 'Información de Contacto', [
        ['Correo electrónico', afiliado.contacto.correoElectronico],
        ['Teléfono celular', afiliado.contacto.celular],
        ...(afiliado.contacto.telefonoFijo
          ? [['Teléfono fijo', afiliado.contacto.telefonoFijo] as [string, string]]
          : []),
      ]);
    }

    // ── Información sociodemográfica ─────────────────
    if (afiliado.sociodemografica) {
      const socio = afiliado.sociodemografica;
      y = this.dibujarSeccion(doc, y, 'Información Sociodemográfica', [
        ['Dirección', socio.direccion],
        ['Zona', socio.zona === 'urbano' ? 'Urbana' : 'Rural'],
        ...(socio.barrio ? [['Barrio', socio.barrio] as [string, string]] : []),
        ['Estrato', `Estrato ${socio.estrato}`],
        ...(socio.estadoCivil
          ? [['Estado civil', this.formatEstadoCivil(socio.estadoCivil)] as [string, string]]
          : []),
      ]);
    }

    // ── Información laboral ─────────────────────────
    if (afiliado.laboral) {
      const lab = afiliado.laboral;
      y = this.dibujarSeccion(doc, y, 'Información Laboral', [
        ['Tipo de afiliado', this.formatTipoAfiliado(lab.tipoAfiliado)],
        ...(lab.secretariaEducacion
          ? [['Secretaría de Educación', lab.secretariaEducacion] as [string, string]]
          : []),
        ...(lab.institucionEducativa
          ? [['Institución Educativa', lab.institucionEducativa] as [string, string]]
          : []),
        ...(lab.cargo ? [['Cargo', lab.cargo] as [string, string]] : []),
      ]);
    }

    // ── Beneficiarios ───────────────────────────────
    const benefActualizados = afiliado.beneficiarios?.filter(b => b.actualizado) || [];
    if (benefActualizados.length > 0) {
      y = this.verificarSaltoPagina(doc, y, 40);
      y = this.dibujarEncabezadoSeccion(doc, y, 'Beneficiarios Actualizados');
      for (const b of benefActualizados) {
        y = this.verificarSaltoPagina(doc, y, 14);
        doc.setFillColor(...this.COLOR_LIGHT_BG);
        doc.roundedRect(this.MARGIN_X, y, this.CONTENT_WIDTH, 12, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...this.COLOR_TEXT);
        doc.text(
          `${b.primerNombre} ${b.primerApellido} — ${b.parentesco} — ${b.edad} años`,
          this.MARGIN_X + 4,
          y + 7.5
        );
        // Checkmark
        doc.setTextColor(...this.COLOR_SUCCESS);
        doc.setFont('helvetica', 'bold');
        doc.text('✓', this.MARGIN_X + this.CONTENT_WIDTH - 8, y + 7.5);
        y += 14;
      }
      y += 4;
    }

    // ── Metadatos (folio + fecha) ───────────────────
    y = this.verificarSaltoPagina(doc, y, 30);
    doc.setDrawColor(...this.COLOR_BORDER);
    doc.line(this.MARGIN_X, y, this.MARGIN_X + this.CONTENT_WIDTH, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...this.COLOR_MUTED);
    doc.text(`Fecha de actualización: ${fecha}`, this.MARGIN_X, y);
    y += 5;
    doc.text(`Folio: ${folio}`, this.MARGIN_X, y);

    // ── Pie de página ───────────────────────────────
    this.dibujarPiePagina(doc);

    // ── Descargar ───────────────────────────────────
    const nombreArchivo = `Comprobante_FOMAG_${folio}.pdf`;
    doc.save(nombreArchivo);
  }

  // ════════════════════════════════════════════════════
  // Métodos privados de dibujo
  // ════════════════════════════════════════════════════

  /**
   * Dibuja el encabezado institucional FOMAG
   */
  private dibujarEncabezado(doc: jsPDF, folio: string): number {
    let y = 0;

    // Franja superior de color primario
    doc.setFillColor(...this.COLOR_PRIMARY);
    doc.rect(0, 0, this.PAGE_WIDTH, 36, 'F');

    // Título FOMAG
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...this.COLOR_WHITE);
    doc.text('FOMAG', this.MARGIN_X, 16);

    // Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Fondo Nacional de Prestaciones Sociales del Magisterio', this.MARGIN_X, 23);

    // Folio en la esquina derecha
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(folio, this.PAGE_WIDTH - this.MARGIN_X, 16, { align: 'right' });

    // Línea decorativa debajo
    doc.setFillColor(...this.COLOR_SUCCESS);
    doc.rect(0, 36, this.PAGE_WIDTH, 2, 'F');

    y = 48;

    // Título del documento
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...this.COLOR_TEXT);
    doc.text('Soporte de Actualización de Datos', this.PAGE_WIDTH / 2, y, {
      align: 'center',
    });

    return y + 10;
  }

  /**
   * Dibuja el banner de éxito
   */
  private dibujarBannerExito(doc: jsPDF, y: number): number {
    doc.setFillColor(236, 253, 245); // green-50
    doc.roundedRect(this.MARGIN_X, y, this.CONTENT_WIDTH, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...this.COLOR_SUCCESS);
    doc.text('✓  Datos actualizados exitosamente', this.PAGE_WIDTH / 2, y + 9, {
      align: 'center',
    });
    return y + 20;
  }

  /**
   * Dibuja una sección con encabezado y pares clave-valor
   */
  private dibujarSeccion(
    doc: jsPDF,
    y: number,
    titulo: string,
    campos: [string, string][]
  ): number {
    y = this.verificarSaltoPagina(doc, y, 20 + campos.length * 10);
    y = this.dibujarEncabezadoSeccion(doc, y, titulo);

    for (const [label, value] of campos) {
      y = this.verificarSaltoPagina(doc, y, 10);
      // Fondo alternado sutil
      doc.setFillColor(...this.COLOR_LIGHT_BG);
      doc.roundedRect(this.MARGIN_X, y, this.CONTENT_WIDTH, 9, 1.5, 1.5, 'F');

      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...this.COLOR_MUTED);
      doc.text(label, this.MARGIN_X + 4, y + 6);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...this.COLOR_TEXT);
      const truncValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
      doc.text(truncValue, this.MARGIN_X + 65, y + 6);

      y += 10;
    }

    return y + 4;
  }

  /**
   * Dibuja el encabezado de una sección
   */
  private dibujarEncabezadoSeccion(doc: jsPDF, y: number, titulo: string): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...this.COLOR_PRIMARY);

    // Pequeña barra decorativa
    doc.setFillColor(...this.COLOR_PRIMARY);
    doc.roundedRect(this.MARGIN_X, y + 1, 3, 6, 1, 1, 'F');

    doc.text(titulo, this.MARGIN_X + 6, y + 6);
    return y + 12;
  }

  /**
   * Dibuja el pie de página en todas las páginas
   */
  private dibujarPiePagina(doc: jsPDF): void {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Línea separadora
      doc.setDrawColor(...this.COLOR_BORDER);
      doc.line(
        this.MARGIN_X,
        this.PAGE_HEIGHT - 20,
        this.MARGIN_X + this.CONTENT_WIDTH,
        this.PAGE_HEIGHT - 20
      );

      // Texto legal
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...this.COLOR_MUTED);
      doc.text(
        'Este documento es un soporte informativo de la actualización de datos realizada. ' +
          'Protegido bajo la Ley 1581 de 2012 (Protección de Datos Personales).',
        this.PAGE_WIDTH / 2,
        this.PAGE_HEIGHT - 15,
        { align: 'center', maxWidth: this.CONTENT_WIDTH }
      );

      // Número de página
      doc.text(
        `Página ${i} de ${totalPages}`,
        this.PAGE_WIDTH / 2,
        this.PAGE_HEIGHT - 8,
        { align: 'center' }
      );
    }
  }

  /**
   * Verifica si hay espacio suficiente en la página, si no agrega una nueva
   */
  private verificarSaltoPagina(doc: jsPDF, y: number, espacioRequerido: number): number {
    if (y + espacioRequerido > this.PAGE_HEIGHT - 25) {
      doc.addPage();
      return 15;
    }
    return y;
  }

  // ════════════════════════════════════════════════════
  // Utilidades de formateo
  // ════════════════════════════════════════════════════

  private getNombreCompleto(afiliado: DatosAfiliado): string {
    return [
      afiliado.primerNombre,
      afiliado.segundoNombre,
      afiliado.primerApellido,
      afiliado.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private formatCedula(numero: string): string {
    if (!numero) return '';
    return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private formatFecha(fecha: string): string {
    if (!fecha) return '';
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return fecha;
    }
  }

  private formatEstadoCivil(estado: string): string {
    const mapa: Record<string, string> = {
      soltero: 'Soltero(a)',
      casado: 'Casado(a)',
      viudo: 'Viudo(a)',
      union_libre: 'Unión Libre',
    };
    return mapa[estado] || estado;
  }

  private formatTipoAfiliado(tipo: string): string {
    const mapa: Record<string, string> = {
      docente_activo: 'Docente Activo',
      directivo_activo: 'Directivo Docente Activo',
      pensionado: 'Pensionado',
      beneficiario: 'Beneficiario',
    };
    return mapa[tipo] || tipo;
  }
}
