/**
 * Datos geográficos de Colombia (DIVIPOLA)
 * Departamentos, municipios, localidades y barrios
 */

export interface Departamento {
  codigo: string;
  nombre: string;
}

export interface Municipio {
  codigo: string;
  nombre: string;
  codigoDepartamento: string;
}

export interface Localidad {
  codigo: string;
  nombre: string;
  codigoMunicipio: string;
}

export interface Barrio {
  codigo: string;
  nombre: string;
  codigoLocalidad: string;
}

export interface Secretaria {
  codigo: string;
  nombre: string;
  codigoMunicipio: string;
}

export interface InstitucionEducativa {
  codigo: string;
  nombre: string;
  codigoSecretaria: string;
}

// ============================================================================
// DATOS DE EJEMPLO (En producción vendrían de un API)
// ============================================================================

export const DEPARTAMENTOS: Departamento[] = [
  { codigo: '05', nombre: 'Antioquia' },
  { codigo: '08', nombre: 'Atlántico' },
  { codigo: '11', nombre: 'Bogotá D.C.' },
  { codigo: '13', nombre: 'Bolívar' },
  { codigo: '15', nombre: 'Boyacá' },
  { codigo: '17', nombre: 'Caldas' },
  { codigo: '18', nombre: 'Caquetá' },
  { codigo: '19', nombre: 'Cauca' },
  { codigo: '20', nombre: 'Cesar' },
  { codigo: '23', nombre: 'Córdoba' },
  { codigo: '25', nombre: 'Cundinamarca' },
  { codigo: '27', nombre: 'Chocó' },
  { codigo: '41', nombre: 'Huila' },
  { codigo: '44', nombre: 'La Guajira' },
  { codigo: '47', nombre: 'Magdalena' },
  { codigo: '50', nombre: 'Meta' },
  { codigo: '52', nombre: 'Nariño' },
  { codigo: '54', nombre: 'Norte de Santander' },
  { codigo: '63', nombre: 'Quindío' },
  { codigo: '66', nombre: 'Risaralda' },
  { codigo: '68', nombre: 'Santander' },
  { codigo: '70', nombre: 'Sucre' },
  { codigo: '73', nombre: 'Tolima' },
  { codigo: '76', nombre: 'Valle del Cauca' },
];

export const MUNICIPIOS: Municipio[] = [
  // Antioquia
  { codigo: '05001', nombre: 'Medellín', codigoDepartamento: '05' },
  { codigo: '05088', nombre: 'Bello', codigoDepartamento: '05' },
  { codigo: '05360', nombre: 'Itagüí', codigoDepartamento: '05' },
  { codigo: '05266', nombre: 'Envigado', codigoDepartamento: '05' },
  // Atlántico
  { codigo: '08001', nombre: 'Barranquilla', codigoDepartamento: '08' },
  { codigo: '08758', nombre: 'Soledad', codigoDepartamento: '08' },
  // Bogotá
  { codigo: '11001', nombre: 'Bogotá D.C.', codigoDepartamento: '11' },
  // Bolívar
  { codigo: '13001', nombre: 'Cartagena', codigoDepartamento: '13' },
  // Valle del Cauca
  { codigo: '76001', nombre: 'Cali', codigoDepartamento: '76' },
  { codigo: '76109', nombre: 'Buenaventura', codigoDepartamento: '76' },
  { codigo: '76520', nombre: 'Palmira', codigoDepartamento: '76' },
  // Santander
  { codigo: '68001', nombre: 'Bucaramanga', codigoDepartamento: '68' },
  { codigo: '68276', nombre: 'Floridablanca', codigoDepartamento: '68' },
  // Cundinamarca
  { codigo: '25754', nombre: 'Soacha', codigoDepartamento: '25' },
  { codigo: '25269', nombre: 'Facatativá', codigoDepartamento: '25' },
];

export const LOCALIDADES_BOGOTA: Localidad[] = [
  { codigo: '01', nombre: 'Usaquén', codigoMunicipio: '11001' },
  { codigo: '02', nombre: 'Chapinero', codigoMunicipio: '11001' },
  { codigo: '03', nombre: 'Santa Fe', codigoMunicipio: '11001' },
  { codigo: '04', nombre: 'San Cristóbal', codigoMunicipio: '11001' },
  { codigo: '05', nombre: 'Usme', codigoMunicipio: '11001' },
  { codigo: '06', nombre: 'Tunjuelito', codigoMunicipio: '11001' },
  { codigo: '07', nombre: 'Bosa', codigoMunicipio: '11001' },
  { codigo: '08', nombre: 'Kennedy', codigoMunicipio: '11001' },
  { codigo: '09', nombre: 'Fontibón', codigoMunicipio: '11001' },
  { codigo: '10', nombre: 'Engativá', codigoMunicipio: '11001' },
  { codigo: '11', nombre: 'Suba', codigoMunicipio: '11001' },
  { codigo: '12', nombre: 'Barrios Unidos', codigoMunicipio: '11001' },
  { codigo: '13', nombre: 'Teusaquillo', codigoMunicipio: '11001' },
  { codigo: '14', nombre: 'Los Mártires', codigoMunicipio: '11001' },
  { codigo: '15', nombre: 'Antonio Nariño', codigoMunicipio: '11001' },
  { codigo: '16', nombre: 'Puente Aranda', codigoMunicipio: '11001' },
  { codigo: '17', nombre: 'La Candelaria', codigoMunicipio: '11001' },
  { codigo: '18', nombre: 'Rafael Uribe Uribe', codigoMunicipio: '11001' },
  { codigo: '19', nombre: 'Ciudad Bolívar', codigoMunicipio: '11001' },
  { codigo: '20', nombre: 'Sumapaz', codigoMunicipio: '11001' },
];

export const BARRIOS_EJEMPLO: Barrio[] = [
  { codigo: '001', nombre: 'Centro', codigoLocalidad: '03' },
  { codigo: '002', nombre: 'La Macarena', codigoLocalidad: '03' },
  { codigo: '003', nombre: 'Chicó', codigoLocalidad: '02' },
  { codigo: '004', nombre: 'El Nogal', codigoLocalidad: '02' },
  { codigo: '005', nombre: 'Santa Bárbara', codigoLocalidad: '01' },
  { codigo: '006', nombre: 'Cedritos', codigoLocalidad: '01' },
  { codigo: '007', nombre: 'Suba Centro', codigoLocalidad: '11' },
  { codigo: '008', nombre: 'Niza', codigoLocalidad: '11' },
  { codigo: '009', nombre: 'Kennedy Central', codigoLocalidad: '08' },
  { codigo: '010', nombre: 'Timiza', codigoLocalidad: '08' },
];

export const SECRETARIAS: Secretaria[] = [
  { codigo: 'SED-BOG', nombre: 'Secretaría de Educación de Bogotá', codigoMunicipio: '11001' },
  { codigo: 'SED-MED', nombre: 'Secretaría de Educación de Medellín', codigoMunicipio: '05001' },
  { codigo: 'SED-CAL', nombre: 'Secretaría de Educación de Cali', codigoMunicipio: '76001' },
  { codigo: 'SED-BAQ', nombre: 'Secretaría de Educación de Barranquilla', codigoMunicipio: '08001' },
  { codigo: 'SED-CTG', nombre: 'Secretaría de Educación de Cartagena', codigoMunicipio: '13001' },
  { codigo: 'SED-BUC', nombre: 'Secretaría de Educación de Bucaramanga', codigoMunicipio: '68001' },
];

export const INSTITUCIONES_EDUCATIVAS: InstitucionEducativa[] = [
  { codigo: 'IE-001', nombre: 'Colegio Distrital Francisco de Paula Santander', codigoSecretaria: 'SED-BOG' },
  { codigo: 'IE-002', nombre: 'Colegio Distrital Simón Bolívar', codigoSecretaria: 'SED-BOG' },
  { codigo: 'IE-003', nombre: 'Colegio Distrital República de Colombia', codigoSecretaria: 'SED-BOG' },
  { codigo: 'IE-004', nombre: 'Institución Educativa INEM José Félix de Restrepo', codigoSecretaria: 'SED-MED' },
  { codigo: 'IE-005', nombre: 'Institución Educativa Santa Juana de Lestonnac', codigoSecretaria: 'SED-CAL' },
];

// Aliases for easier imports
export const SECRETARIAS_EDUCACION = SECRETARIAS;
export const BARRIOS_BOGOTA = BARRIOS_EJEMPLO;
