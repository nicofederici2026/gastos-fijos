-- Borrar tablas si existen
DROP TABLE IF EXISTS gastos_fijos;
DROP TABLE IF EXISTS cuentas;

-- Crear tabla de cuentas
CREATE TABLE cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla de gastos fijos
CREATE TABLE gastos_fijos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID REFERENCES cuentas(id) ON DELETE CASCADE NOT NULL,
    mes INTEGER CHECK (mes >= 1 AND mes <= 12) NOT NULL,
    anio INTEGER NOT NULL,
    monto NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    vencimiento DATE,
    pagado BOOLEAN DEFAULT false,
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para mejorar rendimiento en búsquedas comunes
CREATE INDEX idx_gastos_ff_mes_anio ON gastos_fijos(anio, mes);
CREATE INDEX idx_gastos_ff_cuenta ON gastos_fijos(cuenta_id);

-- Habilitar RLS (Row Level Security) - Nota: En este caso se asume un único usuario.
-- Si quieres acceso total con la anon key (sin login), asegúrate de configurar las políticas:
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_fijos ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo/app personal sin usuario logueado
CREATE POLICY "Public Read Access" ON cuentas FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON cuentas FOR ALL USING (true);

CREATE POLICY "Public Read Access" ON gastos_fijos FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON gastos_fijos FOR ALL USING (true);
