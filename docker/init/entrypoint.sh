#!/bin/bash
set -e

# Start SQL Server in the background
/opt/mssql/bin/sqlservr &
MSSQL_PID=$!

# Wait for SQL Server to be ready
echo "Waiting for SQL Server to start..."
for i in $(seq 1 60); do
    if /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" &>/dev/null; then
        echo "SQL Server is ready."
        break
    fi
    echo "Not ready yet... attempt $i/60"
    sleep 2
done

# Check if SQL Server started successfully
if ! /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" &>/dev/null; then
    echo "ERROR: SQL Server failed to start within timeout."
    exit 1
fi

# Check if database already exists (skip init if so)
DB_EXISTS=$(/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -h -1 -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = 'fomag_poblacion'" | tr -d '[:space:]')

if [ "$DB_EXISTS" = "0" ]; then
    echo "Running initialization scripts..."

    echo "Creating database and tables..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -i /docker-entrypoint-init/01-create-database.sql

    echo "Importing CSV data..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -i /docker-entrypoint-init/02-import-data.sql

    echo "Adding form columns..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -i /docker-entrypoint-init/03-add-form-columns.sql

    echo "Applying schema enhancements..."
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -i /docker-entrypoint-init/04-schema-enhancements.sql

    echo "Initialization complete."
else
    echo "Database fomag_poblacion already exists. Skipping initialization."
fi

# Keep SQL Server in the foreground
wait $MSSQL_PID
