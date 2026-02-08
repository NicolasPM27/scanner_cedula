#!/bin/bash
set -e

# ============================================================
# Entrypoint para Azure SQL Edge con init scripts
# Auto-detecta sqlcmd y sincroniza contraseña de SA en
# volúmenes existentes (resuelve "Password did not match").
# ============================================================

# Detectar sqlcmd en rutas conocidas
find_sqlcmd() {
  for candidate in \
    /opt/mssql-tools18/bin/sqlcmd \
    /opt/mssql-tools/bin/sqlcmd \
    "$(command -v sqlcmd 2>/dev/null || true)"; do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return
    fi
  done
  echo ""
}

SQLCMD=$(find_sqlcmd)
if [ -z "$SQLCMD" ]; then
  echo "ERROR: sqlcmd no encontrado. Verifica que mssql-tools esté instalado."
  exit 1
fi
echo "Usando sqlcmd: $SQLCMD"

# Flags de conexión — -C confía en el certificado autofirmado, -No deshabilita
# encripción obligatoria (compatible con Azure SQL Edge local)
SQLCMD_FLAGS="-S localhost -U sa -C -No"

# Start SQL Server in the background
/opt/mssql/bin/sqlservr &
MSSQL_PID=$!

# Wait for SQL Server to accept connections (with current or old password)
echo "Waiting for Azure SQL Edge to start..."
CONNECTED=false
for i in $(seq 1 60); do
    # Intentar con la contraseña deseada
    if $SQLCMD $SQLCMD_FLAGS -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" &>/dev/null; then
        echo "Azure SQL Edge is ready (password OK)."
        CONNECTED=true
        break
    fi
    # Si el servidor responde pero rechaza la contraseña, no esperar más
    if $SQLCMD $SQLCMD_FLAGS -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" 2>&1 | grep -q "Login failed"; then
        echo "Server is up but password mismatch — attempting SA password reset..."
        # Azure SQL Edge: usar proceso de cambio de contraseña via ALTER LOGIN
        # Necesitamos un one-time bootstrap con single-user mode
        kill $MSSQL_PID 2>/dev/null || true
        wait $MSSQL_PID 2>/dev/null || true

        echo "Restarting in single-user mode for password reset..."
        /opt/mssql/bin/sqlservr --single-user &
        MSSQL_PID=$!
        sleep 5

        # En single-user mode, la primera conexión es admin sin contraseña check
        $SQLCMD -S localhost -C -No -Q "ALTER LOGIN [sa] WITH PASSWORD = '$MSSQL_SA_PASSWORD';" 2>/dev/null && {
            echo "SA password reset successful."
        } || {
            echo "WARN: Single-user password reset failed, trying direct..."
        }

        # Restart en modo normal
        kill $MSSQL_PID 2>/dev/null || true
        wait $MSSQL_PID 2>/dev/null || true

        /opt/mssql/bin/sqlservr &
        MSSQL_PID=$!

        # Esperar que reinicie
        for j in $(seq 1 30); do
            if $SQLCMD $SQLCMD_FLAGS -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" &>/dev/null; then
                echo "Azure SQL Edge is ready (password synced)."
                CONNECTED=true
                break 2
            fi
            echo "Waiting after password reset... attempt $j/30"
            sleep 2
        done
        break
    fi
    echo "Not ready yet... attempt $i/60"
    sleep 2
done

# Final verification
if [ "$CONNECTED" != "true" ]; then
    if $SQLCMD $SQLCMD_FLAGS -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" &>/dev/null; then
        CONNECTED=true
    fi
fi

if [ "$CONNECTED" != "true" ]; then
    echo "ERROR: Azure SQL Edge failed to start or authenticate within timeout."
    echo "TIP: Try removing the volume: docker volume rm docker_sqlserver-data"
    exit 1
fi

# De aquí en adelante, usar la contraseña correcta
SQLCMD_AUTH="$SQLCMD_FLAGS -P $MSSQL_SA_PASSWORD"

# Check if database already exists (skip init if so)
DB_EXISTS=$($SQLCMD $SQLCMD_AUTH -h -1 -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = 'fomag_poblacion'" | tr -d '[:space:]')

if [ "$DB_EXISTS" = "0" ]; then
    echo "Running initialization scripts..."

    echo "Creating database and tables..."
    $SQLCMD $SQLCMD_AUTH -i /docker-entrypoint-init/01-create-database.sql

    echo "Importing CSV data..."
    $SQLCMD $SQLCMD_AUTH -i /docker-entrypoint-init/02-import-data.sql

    echo "Adding form columns..."
    $SQLCMD $SQLCMD_AUTH -i /docker-entrypoint-init/03-add-form-columns.sql

    echo "Applying schema enhancements..."
    $SQLCMD $SQLCMD_AUTH -i /docker-entrypoint-init/04-schema-enhancements.sql

    echo "Creating instituciones educativas schema..."
    $SQLCMD $SQLCMD_AUTH -i /docker-entrypoint-init/05-instituciones-educativas.sql

    echo "Seeding instituciones educativas sample data..."
    $SQLCMD $SQLCMD_AUTH -i /docker-entrypoint-init/06-seed-instituciones-sample.sql

    echo "Initialization complete."
else
    echo "Database fomag_poblacion already exists. Skipping initialization."
fi

# Keep SQL Server in the foreground
wait $MSSQL_PID
