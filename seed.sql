-- Limpiar tablas
DELETE FROM gastos_fijos;
DELETE FROM cuentas;

-- Inserción de cuentas base
INSERT INTO cuentas (nombre) VALUES 
('Alquiler'),
('Expensas'),
('Seguro Auto'),
('Patente'),
('Internet (Fibertel)'),
('Luz (Edenor)'),
('Gas (Metrogas)'),
('Gimnasio'),
('Spotify / Netflix'),
('Tarjeta Visa (Frances)');

-- Variables para IDs (Simulación para seed manual en SQL)
-- En una ejecución real de backend, obtendríamos los UUIDs. Aquí usamos subconsultas.

-- Datos de ejemplo 2024 (Meses 10, 11, 12)
INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 10, 2024, 150000, '2024-10-05', true, 'Pago puntual' FROM cuentas WHERE nombre = 'Alquiler';

INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 10, 2024, 35000, '2024-10-15', true, '' FROM cuentas WHERE nombre = 'Expensas';

INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 10, 2024, 12000, '2024-10-10', true, '' FROM cuentas WHERE nombre = 'Internet (Fibertel)';

-- Datos 2025 (Mes 1 - Enero)
INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 1, 2025, 175000, '2025-01-05', true, 'Aumento anual' FROM cuentas WHERE nombre = 'Alquiler';

INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 1, 2025, 42000, '2025-01-15', false, 'Pendiente liquidación' FROM cuentas WHERE nombre = 'Expensas';

INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 1, 2025, 15800, '2025-01-10', true, '' FROM cuentas WHERE nombre = 'Internet (Fibertel)';

INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 1, 2025, 23000, '2025-01-20', false, '' FROM cuentas WHERE nombre = 'Seguro Auto';

-- Datos 2025 (Mes 2 - Febrero - Ejemplo para clonar a Marzo)
INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 2, 2025, 175000, '2025-02-05', true, '' FROM cuentas WHERE nombre = 'Alquiler';

INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 2, 2025, 45000, '2025-02-15', true, '' FROM cuentas WHERE nombre = 'Expensas';

INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 2, 2025, 15800, '2025-02-10', true, '' FROM cuentas WHERE nombre = 'Internet (Fibertel)';

-- Datos 2026 (Próximo año)
INSERT INTO gastos_fijos (cuenta_id, mes, anio, monto, vencimiento, pagado, comentario)
SELECT id, 1, 2026, 210000, '2026-01-05', false, 'Proyectado' FROM cuentas WHERE nombre = 'Alquiler';
