import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { GastoWithCuenta } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Calendar, ReceiptText, TrendingDown } from 'lucide-react';

export const History: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [history, setHistory] = useState<GastoWithCuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalMonth, setTotalMonth] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('*, cuentas(*)')
      .eq('mes', selectedMonth)
      .eq('anio', selectedYear)
      .order('monto', { ascending: false });

    if (!error && data) {
      const mapped = data.map(g => ({
        ...g,
        cuenta_nombre: g.cuentas?.nombre
      }));
      setHistory(mapped);
      
      const sum = mapped.reduce((acc, curr) => acc + Number(curr.monto), 0);
      setTotalMonth(sum);
    }
    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Search/Filter Panel */}
      <header className="bg-panel p-4 rounded-2xl border border-border-subtle flex items-center gap-4 shadow-sm">
        <div className="flex-1 flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2 ml-1 flex items-center gap-1">
              Mes
            </label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full appearance-none bg-background/50 border border-border-subtle hover:border-border-subtle/80 px-4 py-3 rounded-xl text-text-main text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-inner transition-all capitalize"
            >
              {meses.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] uppercase font-black text-text-muted tracking-widest mb-2 ml-1 flex items-center gap-1">
              Año
            </label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full appearance-none bg-background/50 border border-border-subtle hover:border-border-subtle/80 px-4 py-3 rounded-xl text-text-main text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-inner transition-all text-center"
            >
              {[2026, 2027, 2028, 2029].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        
        <div className="h-10 w-px bg-border-subtle mx-2" />

        <div className="bg-primary/5 border border-primary/20 px-6 py-2 rounded-2xl flex flex-col items-end">
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">Total Periodo</span>
          <span className="text-xl font-black text-primary font-mono">{formatCurrency(totalMonth)}</span>
        </div>
      </header>

      {/* History Table */}
      <div className="bg-panel rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-text-main text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <ReceiptText className="w-3.5 h-3.5 text-primary" />
            Detalle de Gastos
          </h3>
          {history.length > 0 && (
            <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase bg-background px-2 py-1 rounded-lg border border-border-subtle">
              <TrendingDown className="w-3 h-3 text-warning" />
              {history.length} Gastos Registrados
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-text-muted text-[9px] font-black uppercase tracking-widest border-b border-border-subtle">
                <th className="px-6 py-3">Cuenta</th>
                <th className="px-6 py-3">Monto</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-20 text-[9px] font-black uppercase tracking-widest text-text-muted animate-pulse">Consultando historial...</td></tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-24">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Calendar className="w-10 h-10" />
                      <span className="text-xs italic">No hay registros para {meses[selectedMonth - 1]} {selectedYear}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map(g => (
                  <tr key={g.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-2.5">
                      <span className="font-bold text-sm text-text-main">{g.cuenta_nombre}</span>
                    </td>
                    <td className="px-6 py-2.5 font-mono text-sm font-bold text-text-main">
                      {formatCurrency(g.monto)}
                    </td>
                    <td className="px-6 py-2.5">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ring-1",
                        g.pagado 
                          ? "bg-primary/5 text-primary ring-primary/20" 
                          : "bg-warning/5 text-warning ring-warning/20"
                      )}>
                        {g.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-xs text-text-muted italic max-w-xs truncate group-hover:text-text-main transition-colors">
                      {g.comentario || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
