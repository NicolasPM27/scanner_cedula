import { Injectable } from '@angular/core';
import {
  CedulaData,
  Genero,
  GrupoRH,
  Ubicacion,
  PDF417_CONSTANTS,
  MRZ_TD1_CONSTANTS
} from '../models/cedula.model';
import { LOCALIDADES } from '../data/localidades.data';

/**
 * Servicio para parsear datos de cédulas colombianas
 *
 * Implementación basada en la estructura oficial de la Registraduría Nacional:
 * - PDF417: Código de barras de cédulas antiguas (530 bytes, codificación latin-1)
 * - MRZ TD1: Machine Readable Zone de cédulas nuevas (3 líneas de 30 caracteres)
 *
 * Referencias:
 * - https://github.com/Eitol/colombian-cedula-reader
 * - https://github.com/Eitol/colombian_cedula_mrz_reader
 */
@Injectable({
  providedIn: 'root'
})
export class CedulaParserService {

  /**
   * ============================================================
   * SECCIÓN 1: PARSING DE CÉDULAS ANTIGUAS (PDF417)
   * ============================================================
   *
   * Estructura del código PDF417 de cédulas colombianas:
   * - Longitud total: ~530 bytes
   * - Codificación: latin-1
   * - Identificador: Contiene "PubDSK_" en los datos
   * - Separador de campos: Carácter nulo (\x00)
   *
   * Estructura de campos (separados por \x00):
   * [0]: Código AFIS (después de caracteres iniciales)
   * [2]: Tarjeta dactilar (8 chars) + Número documento (10 chars) + Primer apellido
   * [3]: Segundo apellido
   * [4]: Primer nombre
   * [5]: Segundo nombre
   * [6]: Género(1) + Año(4) + Mes(2) + Día(2) + CodMunicipio(2) + CodDepto(3) + RH(2)
   */

  /**
   * Parsea los datos crudos del código PDF417 de una cédula antigua
   * @param rawData - Cadena de datos crudos del escáner (puede ser string o bytes)
   * @returns Objeto CedulaData con los datos extraídos
   * @throws Error si el formato no es reconocido
   */
  parsePDF417(rawData: string | Uint8Array): CedulaData {
    // Convertir a string si es necesario
    const dataStr = typeof rawData === 'string'
      ? rawData
      : this.uint8ArrayToLatin1(rawData);

    if (!dataStr || dataStr.length < 100) {
      throw new Error('Datos PDF417 vacíos o muy cortos');
    }

    // Verificar identificador del formato colombiano
    // El identificador "PubDSK_" indica que es una cédula colombiana válida
    if (!dataStr.includes(PDF417_CONSTANTS.IDENTIFIER)) {
      throw new Error('Formato no reconocido: No se encontró identificador de cédula colombiana');
    }

    // Normalizar: Reemplazar secuencias de múltiples nulos por uno solo
    // Regex: (\x00){2,} - Dos o más caracteres nulos consecutivos
    const normalizedData = dataStr.replace(/\x00{2,}/g, '\x00');

    // Dividir por el separador nulo
    const segments = normalizedData.split('\x00').filter(s => s.length > 0);

    if (segments.length < 6) {
      throw new Error('Formato PDF417 inválido: Segmentos insuficientes');
    }

    return this.extractPDF417Fields(segments);
  }

  /**
   * Extrae los campos de los segmentos del PDF417
   * La estructura puede variar ligeramente entre diferentes versiones de cédulas
   */
  private extractPDF417Fields(segments: string[]): CedulaData {
    /**
     * Estructura típica de segmentos:
     * segments[0]: Contiene código AFIS (después de caracteres iniciales)
     * segments[1]: "PubDSK_" u otro identificador
     * segments[2]: Puede contener: tarjetaDactilar(8) + numeroDocumento(10) + primerApellido
     * segments[3]: Segundo apellido
     * segments[4]: Primer nombre
     * segments[5]: Segundo nombre (puede terminar en +/- si no hay segundo nombre)
     * segments[6]: Contiene datos demográficos compactos
     */

    // Extraer código AFIS del primer segmento (después de los primeros 2 caracteres)
    const codigoAfis = segments[0].substring(2).trim();

    // El segmento 2 puede tener diferentes formatos
    let tarjetaDactilar = '';
    let numeroDocumento = '';
    let primerApellido = '';

    const seg2 = segments[2] || '';

    if (seg2.length > 18) {
      // Formato: tarjetaDactilar(8) + numeroDocumento(10) + primerApellido
      tarjetaDactilar = seg2.substring(0, 8).trim();
      numeroDocumento = seg2.substring(10, 18).replace(/^0+/, ''); // Eliminar ceros a la izquierda
      primerApellido = seg2.substring(18).trim();
    } else if (seg2.length > 10) {
      // Formato alternativo: numeroDocumento(10) + primerApellido
      numeroDocumento = seg2.substring(0, 10).replace(/^0+/, '');
      primerApellido = seg2.substring(10).trim();
    } else {
      // Buscar número de documento en otros segmentos
      numeroDocumento = this.findDocumentNumber(segments);
      primerApellido = seg2.trim();
    }

    const segundoApellido = (segments[3] || '').trim();
    const primerNombre = (segments[4] || '').trim();

    // El segundo nombre puede terminar en +/- si no existe (indica RH)
    let segundoNombre = (segments[5] || '').trim();
    if (segundoNombre.endsWith('+') || segundoNombre.endsWith('-')) {
      segundoNombre = '';
    }

    // Extraer datos demográficos del segmento 6
    // Formato: [?]Género(1) + Año(4) + Mes(2) + Día(2) + CodMunicipio(2) + CodDepto(3) + [?] + RH(2)
    const demografico = segments[6] || segments[5] || '';
    const datosDemo = this.extractDemograficData(demografico);

    // Buscar ubicación en el catálogo DIVIPOLA
    const ubicacion = this.findUbicacion(datosDemo.codigoMunicipio, datosDemo.codigoDepartamento);

    return {
      numeroDocumento: numeroDocumento || this.findDocumentNumber(segments),
      primerApellido: this.normalizarNombre(primerApellido),
      segundoApellido: this.normalizarNombre(segundoApellido),
      primerNombre: this.normalizarNombre(primerNombre),
      segundoNombre: this.normalizarNombre(segundoNombre),
      nombres: this.normalizarNombre(`${primerNombre} ${segundoNombre}`.trim()),
      fechaNacimiento: datosDemo.fechaNacimiento,
      genero: datosDemo.genero,
      rh: datosDemo.rh,
      tipoDocumento: 'ANTIGUA',
      ubicacion,
      documentoInfo: {
        codigoAfis,
        tarjetaDactilar
      },
      confianza: 85 // PDF417 tiene alta confiabilidad
    };
  }

  /**
   * Extrae datos demográficos del segmento compacto
   * Formato típico: [X]G YYYY MM DD MM DDD [X] RH
   *                    ↑  ↑    ↑  ↑  ↑   ↑      ↑
   *                    |  |    |  |  |   |      Tipo sangre
   *                    |  |    |  |  |   Código departamento
   *                    |  |    |  |  Código municipio
   *                    |  |    |  Día nacimiento
   *                    |  |    Mes nacimiento
   *                    |  Año nacimiento
   *                    Género (M/F)
   */
  private extractDemograficData(data: string): {
    genero: Genero;
    fechaNacimiento: string;
    codigoMunicipio: string;
    codigoDepartamento: string;
    rh: GrupoRH;
  } {
    // Valores por defecto
    let genero: Genero = 'DESCONOCIDO';
    let fechaNacimiento = '';
    let codigoMunicipio = '';
    let codigoDepartamento = '';
    let rh: GrupoRH = 'DESCONOCIDO';

    if (!data || data.length < 10) {
      return { genero, fechaNacimiento, codigoMunicipio, codigoDepartamento, rh };
    }

    // Buscar género (M o F)
    // Regex: \b[MF]\b - Letra M o F como palabra completa
    const generoMatch = data.match(/[MF]/);
    if (generoMatch) {
      genero = generoMatch[0] as Genero;
    }

    // Buscar fecha de nacimiento (8 dígitos: YYYYMMDD)
    // Regex: (19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])
    // - (19|20)\d{2}: Año entre 1900-2099
    // - (0[1-9]|1[0-2]): Mes 01-12
    // - (0[1-9]|[12]\d|3[01]): Día 01-31
    const fechaMatch = data.match(/(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
    if (fechaMatch) {
      const year = fechaMatch[0].substring(0, 4);
      const month = fechaMatch[0].substring(4, 6);
      const day = fechaMatch[0].substring(6, 8);
      fechaNacimiento = `${year}-${month}-${day}`;

      // Los códigos de ubicación vienen después de la fecha
      const afterDate = data.substring(data.indexOf(fechaMatch[0]) + 8);

      // Código municipio: 2 dígitos después de la fecha
      // Código departamento: 3 dígitos después del municipio
      const ubicMatch = afterDate.match(/^(\d{2})(\d{3})/);
      if (ubicMatch) {
        codigoMunicipio = ubicMatch[1];
        codigoDepartamento = ubicMatch[2];
      }
    }

    // Buscar tipo de sangre (RH)
    // Regex: [ABO]{1,2}[+-] - Tipo sanguíneo (A, B, O, AB) seguido de + o -
    const rhMatch = data.match(/[ABO]{1,2}[+-]/);
    if (rhMatch) {
      rh = this.parseRH(rhMatch[0]);
    }

    return { genero, fechaNacimiento, codigoMunicipio, codigoDepartamento, rh };
  }

  /**
   * Busca el número de documento en los segmentos
   * El número de cédula colombiana tiene entre 6 y 10 dígitos
   */
  private findDocumentNumber(segments: string[]): string {
    for (const seg of segments) {
      // Regex: \b\d{6,10}\b - Entre 6 y 10 dígitos como palabra completa
      const match = seg.match(/\b\d{6,10}\b/);
      if (match) {
        return match[0].replace(/^0+/, ''); // Eliminar ceros a la izquierda
      }
    }
    return '';
  }

  /**
   * ============================================================
   * SECCIÓN 2: PARSING DE CÉDULAS NUEVAS (MRZ TD1)
   * ============================================================
   *
   * Formato MRZ TD1 (Travel Document Type 1) - 3 líneas de 30 caracteres
   *
   * LÍNEA 1 (30 chars):
   * Pos 0:     Tipo documento ('I' para ID)
   * Pos 1:     Subtipo ('<' o 'C')
   * Pos 2-4:   Código país emisor ('COL')
   * Pos 5-13:  Número de documento (con padding de 0)
   * Pos 14:    Dígito verificador del documento
   * Pos 15-16: Código de municipio
   * Pos 17-19: Código de departamento
   * Pos 20-29: Relleno (<<<<)
   *
   * LÍNEA 2 (30 chars):
   * Pos 0-5:   Fecha nacimiento (YYMMDD)
   * Pos 6:     Dígito verificador fecha nacimiento
   * Pos 7:     Sexo (M/F/<)
   * Pos 8-13:  Fecha expiración (YYMMDD)
   * Pos 14:    Dígito verificador fecha expiración
   * Pos 15-17: Código nacionalidad ('COL')
   * Pos 18-27: NUIP (con padding de 0)
   * Pos 28:    Dígito verificador NUIP
   * Pos 29:    Dígito verificador compuesto
   *
   * LÍNEA 3 (30 chars):
   * Pos 0-29:  APELLIDOS<<NOMBRES (separados por <<)
   */

  /**
   * Parsea las líneas MRZ de una cédula nueva
   * @param lines - Array de 3 líneas MRZ
   * @returns Objeto CedulaData con los datos extraídos
   * @throws Error si el formato MRZ no es válido
   */
  parseMRZ(lines: string[]): CedulaData {
    if (!lines || lines.length < 3) {
      throw new Error('Se requieren 3 líneas MRZ para formato TD1');
    }

    // Limpiar y normalizar líneas
    const cleanLines = lines.map(line => this.cleanMRZLine(line));

    // Validar longitud de líneas
    for (let i = 0; i < 3; i++) {
      if (cleanLines[i].length < MRZ_TD1_CONSTANTS.LINE_LENGTH - 2) {
        throw new Error(`Línea ${i + 1} muy corta: ${cleanLines[i].length} caracteres`);
      }
    }

    // Rellenar líneas a 30 caracteres
    const l1 = cleanLines[0].padEnd(30, '<');
    const l2 = cleanLines[1].padEnd(30, '<');
    const l3 = cleanLines[2].padEnd(30, '<');

    let confianza = 100;
    const errores: string[] = [];

    // ===== PARSEAR LÍNEA 1 =====
    const tipoDoc = this.normalizeMRZDocType(l1[0]);
    if (tipoDoc !== 'I') {
      confianza -= 10;
      errores.push('Tipo de documento no es ID');
    }

    // Código de país (posiciones 2-4)
    const codigoPais = l1.substring(2, 5).replace(/0/g, 'O'); // Corregir OCR: 0 -> O
    if (codigoPais !== 'COL') {
      confianza -= 10;
      errores.push(`Código de país inesperado: ${codigoPais}`);
    }

    // Número de documento (posiciones 5-13, sin ceros a la izquierda)
    const numeroDocumento = l1.substring(5, 14).replace(/<|^0+/g, '');

    // Dígito verificador del documento (posición 14)
    const checkDigitDoc = l1[14];
    const calculatedCheckDoc = this.calculateMRZCheckDigit(l1.substring(5, 14));
    if (checkDigitDoc !== calculatedCheckDoc) {
      confianza -= 10;
      errores.push(`Dígito verificador documento inválido: ${checkDigitDoc} != ${calculatedCheckDoc}`);
    }

    // Código municipio (posiciones 15-16) y departamento (posiciones 17-19)
    const codigoMunicipio = l1.substring(15, 17);
    const codigoDepartamento = l1.substring(17, 20);

    // ===== PARSEAR LÍNEA 2 =====

    // Fecha de nacimiento (posiciones 0-5, formato YYMMDD)
    const fechaNacRaw = l2.substring(0, 6);
    const checkDigitNac = l2[6];
    const fechaNacimiento = this.parseMRZDate(fechaNacRaw, true);

    // Verificar dígito de fecha nacimiento
    const calculatedCheckNac = this.calculateMRZCheckDigit(fechaNacRaw);
    if (checkDigitNac !== calculatedCheckNac) {
      confianza -= 10;
      errores.push('Dígito verificador fecha nacimiento inválido');
    }

    // Sexo (posición 7)
    const genero = this.parseGeneroMRZ(l2[7]);

    // Fecha de expiración (posiciones 8-13)
    const fechaExpRaw = l2.substring(8, 14);
    const checkDigitExp = l2[14];
    const fechaExpiracion = this.parseMRZDate(fechaExpRaw, false);

    // Verificar dígito de fecha expiración
    const calculatedCheckExp = this.calculateMRZCheckDigit(fechaExpRaw);
    if (checkDigitExp !== calculatedCheckExp) {
      confianza -= 10;
      errores.push('Dígito verificador fecha expiración inválido');
    }

    // NUIP (posiciones 18-27)
    const nuip = l2.substring(18, 28).replace(/<|^0+/g, '');

    // ===== PARSEAR LÍNEA 3 =====
    const { primerApellido, segundoApellido, primerNombre, segundoNombre, truncado } =
      this.parseNombresMRZ(l3);

    // Buscar ubicación
    const ubicacion = this.findUbicacion(codigoMunicipio, codigoDepartamento);
    if (!ubicacion.municipio) {
      confianza -= 10;
      errores.push('Ubicación no encontrada en catálogo DIVIPOLA');
    }

    return {
      numeroDocumento,
      primerApellido: this.normalizarNombre(primerApellido),
      segundoApellido: this.normalizarNombre(segundoApellido),
      primerNombre: this.normalizarNombre(primerNombre),
      segundoNombre: this.normalizarNombre(segundoNombre),
      nombres: this.normalizarNombre(`${primerNombre} ${segundoNombre}`.trim()),
      fechaNacimiento,
      genero,
      rh: 'DESCONOCIDO', // El MRZ no contiene tipo de sangre
      tipoDocumento: 'NUEVA',
      ubicacion,
      fechaExpiracion,
      nuip,
      nombresTruncados: truncado,
      confianza: Math.max(0, confianza)
    };
  }

  /**
   * Calcula el dígito verificador MRZ según estándar ICAO 9303
   *
   * Algoritmo:
   * 1. Asignar valores: 0-9 = 0-9, A-Z = 10-35, < = 0
   * 2. Multiplicar cada valor por peso cíclico [7, 3, 1]
   * 3. Sumar todos los productos
   * 4. Retornar suma módulo 10
   *
   * @param data - Cadena a verificar
   * @returns Dígito verificador (0-9)
   */
  private calculateMRZCheckDigit(data: string): string {
    const weights = [7, 3, 1];
    let checksum = 0;

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      let value: number;

      if (char >= '0' && char <= '9') {
        // Dígitos: usar valor numérico directo
        value = parseInt(char, 10);
      } else if (char >= 'A' && char <= 'Z') {
        // Letras: A=10, B=11, ..., Z=35
        value = char.charCodeAt(0) - 55;
      } else {
        // Carácter de relleno '<' u otros: valor 0
        value = 0;
      }

      // Multiplicar por peso cíclico
      checksum += value * weights[i % 3];
    }

    return (checksum % 10).toString();
  }

  /**
   * Limpia una línea MRZ corrigiendo errores comunes de OCR
   */
  private cleanMRZLine(line: string): string {
    let cleaned = line.toUpperCase().replace(/\s/g, '');

    // Correcciones comunes de OCR:
    // - El carácter '0' puede ser confundido con 'O' en contexto de letras
    // - El carácter '1' puede ser confundido con 'I' o 'L'
    // - El carácter '<' puede aparecer como '«' o '‹'

    // Normalizar caracteres similares a '<'
    cleaned = cleaned.replace(/[«‹‹<＜]/g, '<');

    // Eliminar caracteres no válidos en MRZ (solo A-Z, 0-9, <)
    cleaned = cleaned.replace(/[^A-Z0-9<]/g, '<');

    return cleaned;
  }

  /**
   * Normaliza el tipo de documento MRZ
   * Corrige errores comunes de OCR donde 'I' se lee como 'L', '1', etc.
   */
  private normalizeMRZDocType(char: string): string {
    const normalized = char.toUpperCase();
    // Errores comunes de OCR para 'I'
    if (['L', '1', '|', 'l'].includes(normalized)) {
      return 'I';
    }
    return normalized;
  }

  /**
   * Parsea fecha MRZ (formato YYMMDD)
   * @param dateStr - Fecha en formato YYMMDD
   * @param isPast - Si es true, asume fecha pasada (nacimiento); si false, fecha futura (expiración)
   * @returns Fecha en formato ISO (YYYY-MM-DD)
   */
  private parseMRZDate(dateStr: string, isPast: boolean): string {
    if (!dateStr || dateStr.length < 6) return '';

    const yy = parseInt(dateStr.substring(0, 2), 10);
    const mm = dateStr.substring(2, 4);
    const dd = dateStr.substring(4, 6);

    // Determinar siglo basado en el contexto
    const currentYear = new Date().getFullYear() % 100;
    let year: number;

    if (isPast) {
      // Para fechas de nacimiento: si YY > año actual, es 1900s
      year = yy > currentYear ? 1900 + yy : 2000 + yy;
    } else {
      // Para fechas de expiración: siempre 2000s
      year = 2000 + yy;
    }

    // Validar fecha
    if (parseInt(mm, 10) < 1 || parseInt(mm, 10) > 12) return '';
    if (parseInt(dd, 10) < 1 || parseInt(dd, 10) > 31) return '';

    return `${year}-${mm}-${dd}`;
  }

  /**
   * Parsea nombres y apellidos de la línea 3 del MRZ
   * Formato: APELLIDO1<APELLIDO2<<NOMBRE1<NOMBRE2
   *         Los apellidos se separan de los nombres con <<
   *         Las palabras dentro de cada grupo se separan con <
   */
  private parseNombresMRZ(line: string): {
    primerApellido: string;
    segundoApellido: string;
    primerNombre: string;
    segundoNombre: string;
    truncado: boolean;
  } {
    // Eliminar relleno al final
    const cleaned = line.replace(/<+$/, '');

    // Dividir apellidos y nombres por el separador doble <<
    const parts = cleaned.split('<<');

    // parts[0] = Apellidos, parts[1] = Nombres
    const apellidos = (parts[0] || '').split('<').filter(p => p.length > 0);
    const nombres = (parts[1] || '').split('<').filter(p => p.length > 0);

    // Detectar truncamiento (si la línea termina sin << completo)
    const truncado = parts.length < 2 || nombres.length === 0;

    return {
      primerApellido: apellidos[0] || '',
      segundoApellido: apellidos[1] || '',
      primerNombre: nombres[0] || '',
      segundoNombre: nombres.slice(1).join(' '),
      truncado
    };
  }

  /**
   * ============================================================
   * SECCIÓN 3: FUNCIONES AUXILIARES
   * ============================================================
   */

  /**
   * Convierte Uint8Array a string usando codificación Latin-1
   * Necesario porque el PDF417 colombiano usa esta codificación
   */
  private uint8ArrayToLatin1(data: Uint8Array): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data[i]);
    }
    return result;
  }

  /**
   * Normaliza un nombre: Primera letra mayúscula, resto minúscula
   */
  private normalizarNombre(nombre: string): string {
    if (!nombre) return '';

    return nombre
      .toLowerCase()
      .split(/\s+/)
      .map(palabra => {
        if (palabra.length === 0) return '';
        return palabra.charAt(0).toUpperCase() + palabra.slice(1);
      })
      .join(' ')
      .trim();
  }

  /**
   * Parsea el género del MRZ
   */
  private parseGeneroMRZ(char: string): Genero {
    const upper = (char || '').toUpperCase();
    if (upper === 'M') return 'M';
    if (upper === 'F') return 'F';
    return 'DESCONOCIDO';
  }

  /**
   * Parsea el tipo de sangre RH
   * Formatos aceptados: "O+", "A-", "AB+", "O POSITIVO", etc.
   */
  private parseRH(valor: string): GrupoRH {
    if (!valor) return 'DESCONOCIDO';

    const upper = valor.toUpperCase().replace(/\s/g, '');

    // Normalizar formatos de texto
    let normalized = upper
      .replace('POSITIVO', '+')
      .replace('NEGATIVO', '-')
      .replace('POS', '+')
      .replace('NEG', '-');

    // Extraer tipo y factor
    // Regex: ^(O|A|B|AB)([+-])$ - Tipo sanguíneo seguido de factor
    const match = normalized.match(/^(O|A|B|AB)([+-])$/);
    if (!match) return 'DESCONOCIDO';

    const rh = `${match[1]}${match[2]}` as GrupoRH;

    // Validar que sea un RH válido
    const rhValidos: GrupoRH[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    return rhValidos.includes(rh) ? rh : 'DESCONOCIDO';
  }

  /**
   * Busca la ubicación en el catálogo DIVIPOLA
   * @param codigoMunicipio - Código de municipio (2 dígitos)
   * @param codigoDepartamento - Código de departamento (3 dígitos)
   * @returns Objeto Ubicacion con los nombres
   */
  private findUbicacion(codigoMunicipio: string, codigoDepartamento: string): Ubicacion {
    const ubicacion: Ubicacion = {
      codigoMunicipio,
      codigoDepartamento,
      municipio: '',
      departamento: ''
    };

    if (!codigoMunicipio || !codigoDepartamento) {
      return ubicacion;
    }

    // Buscar en el catálogo de localidades
    const localidad = LOCALIDADES.find(
      loc => loc[0] === codigoMunicipio && loc[1] === codigoDepartamento
    );

    if (localidad) {
      ubicacion.municipio = localidad[2];
      ubicacion.departamento = localidad[3];
    }

    return ubicacion;
  }
}
