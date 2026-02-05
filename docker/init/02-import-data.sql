USE fomag_poblacion;
GO

BULK INSERT dbo.poblacion
FROM '/data/poblacion.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ';',
    ROWTERMINATOR = '\n',
    TABLOCK
);
GO
