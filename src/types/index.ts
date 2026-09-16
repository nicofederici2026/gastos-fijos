export interface Cuenta {
  id: string;
  nombre: string;
  activa: boolean;
  dato?: string;
  created_at?: string;
}

export interface Gasto {
  id: string;
  cuenta_id: string;
  mes: number;
  anio: number;
  monto: number;
  vencimiento: string | null;
  pagado: boolean;
  comentario: string;
  created_at?: string;
  // Join data
  cuentas?: Cuenta;
}

export type GastoWithCuenta = Gasto & {
  cuenta_nombre?: string;
  cuenta_dato?: string;
};
