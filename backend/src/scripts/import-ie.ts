#!/usr/bin/env node

/**
 * CLI para importar instituciones educativas desde Excel (.xlsx) o CSV/TSV.
 *
 * Uso:
 *   npx ts-node src/scripts/import-ie.ts <ruta-al-archivo>
 *
 * Formatos soportados: .xlsx, .xls, .csv, .tsv
 *
 * Variables de entorno requeridas (o .env):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *
 * Ejemplo:
 *   npx ts-node src/scripts/import-ie.ts ../docker/data/TOLIMA_Sedes.xlsx
 */

import * as path from 'path';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto (dos niveles arriba desde scripts/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { connectToDatabase, closeDatabaseConnection } from '../config/database';
import { importarInstituciones } from '../utils/import-instituciones';

const SUPPORTED_EXT = ['.xlsx', '.xls', '.csv', '.tsv'];

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Uso: npx ts-node src/scripts/import-ie.ts <ruta-al-archivo>');
    console.error('   Formatos soportados: .xlsx, .xls, .csv, .tsv');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();

  if (!SUPPORTED_EXT.includes(ext)) {
    console.error(`❌ Formato no soportado: ${ext}`);
    console.error(`   Formatos válidos: ${SUPPORTED_EXT.join(', ')}`);
    process.exit(1);
  }

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Archivo no encontrado: ${absolutePath}`);
    process.exit(1);
  }

  const fileSize = (fs.statSync(absolutePath).size / 1024).toFixed(1);
  console.log(`📂 Archivo: ${absolutePath} (${fileSize} KB)`);
  console.log(`📋 Formato: ${ext.replace('.', '').toUpperCase()}`);
  console.log('🔌 Conectando a la base de datos...');

  try {
    await connectToDatabase();
    console.log('✅ Conectado\n');

    console.log('🔄 Iniciando importación por batches...\n');
    const result = await importarInstituciones(absolutePath);

    console.log('\n═══════════════════════════════════════');
    console.log('📊 RESULTADO DE IMPORTACIÓN');
    console.log('═══════════════════════════════════════');
    console.log(`  Total filas:       ${result.totalRows}`);
    console.log(`  Procesadas OK:     ${result.processed}`);
    console.log(`  Errores:           ${result.errors.length}`);
    console.log(`  Duración:          ${result.duration}`);
    console.log('───────────────────────────────────────');
    console.log(`  Departamentos:     ${result.stats.departamentos}`);
    console.log(`  Municipios:        ${result.stats.municipios}`);
    console.log(`  Secretarías:       ${result.stats.secretarias}`);
    console.log(`  Establecimientos:  ${result.stats.establecimientos}`);
    console.log(`  Sedes:             ${result.stats.sedes}`);
    console.log(`  Niveles:           ${result.stats.niveles}`);
    console.log(`  Modelos:           ${result.stats.modelos}`);
    console.log('═══════════════════════════════════════\n');

    if (result.errors.length > 0) {
      console.log('⚠️  Errores encontrados:');
      result.errors.slice(0, 30).forEach(e => {
        console.log(`   Fila ${e.row}: ${e.message}`);
      });
      if (result.errors.length > 30) {
        console.log(`   ... y ${result.errors.length - 30} errores más (ver ie.importaciones para detalle completo)`);
      }
    }
  } catch (error) {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
    console.log('🔌 Conexión cerrada');
  }
}

main();
