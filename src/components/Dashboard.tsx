import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { GastoWithCuenta } from '../types';
import { cn } from '../lib/utils';
import { Search, CheckSquare, AlertTriangle, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface DashboardProps {
  selectedMonth: number;
  selectedYear: number;
  setTotals: (totals: { total: number; pagado: number; pendiente: number }) => void;
  setPrevMonthTotals: (totals: { total: number; pagado: number }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  selectedMonth,
  selectedYear,
  setTotals,
  setPrevMonthTotals
}) => {
  const [gastos, setGastos] = useState<GastoWithCuenta[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [allCuentas, setAllCuentas] = useState<any[]>([]);
  const [selectedNewCuenta, setSelectedNewCuenta] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchGastos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('gastos_fijos')
        .select('*, cuentas(*)')
        .eq('mes', selectedMonth)
        .eq('anio', selectedYear)
        .order('vencimiento', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        let mapped = data.map(g => ({
          ...g,
          cuenta_nombre: g.cuentas?.nombre,
          cuenta_dato: g.cuentas?.dato
        }));

        if (sortConfig) {
          mapped = mapped.sort((a: any, b: any) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === 'cuenta_nombre') {
              aValue = a.cuenta_nombre?.toLowerCase() ?? '';
              bValue = b.cuenta_nombre?.toLowerCase() ?? '';
            } else if (sortConfig.key === 'monto') {
              aValue = Number(a.monto);
              bValue = Number(b.monto);
            } else if (sortConfig.key === 'vencimiento') {
              aValue = a.vencimiento ? new Date(a.vencimiento).getTime() : 0;
              bValue = b.vencimiento ? new Date(b.vencimiento).getTime() : 0;
            } else if (sortConfig.key === 'pagado') {
              aValue = a.pagado ? 1 : 0;
              bValue = b.pagado ? 1 : 0;
            } else if (sortConfig.key === 'comentario') {
              aValue = a.comentario?.toLowerCase() ?? '';
              bValue = b.comentario?.toLowerCase() ?? '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }

        setGastos(mapped);

        // Recalculate totals for Sidebar
        const currentTotals = mapped.reduce((acc, curr) => {
          if (curr.pagado) acc.pagado += Number(curr.monto);
          else acc.pendiente += Number(curr.monto);
          acc.total += Number(curr.monto);
          return acc;
        }, { total: 0, pagado: 0, pendiente: 0 });
        setTotals(currentTotals);
      }

      // Fetch previous month for comparison
      let prevM = selectedMonth - 1;
      let prevY = selectedYear;
      if (selectedMonth === 1) { prevM = 12; prevY = selectedYear - 1; }

      const { data: prevData, error: prevError } = await supabase
        .from('gastos_fijos')
        .select('monto, pagado')
        .eq('mes', prevM)
        .eq('anio', prevY);

      if (prevError) {
        console.warn('Error fetching previous month:', prevError.message);
      } else if (prevData) {
        const prevSum = prevData.reduce((acc, curr) => ({
          total: acc.total + Number(curr.monto),
          pagado: acc.pagado + (curr.pagado ? Number(curr.monto) : 0)
        }), { total: 0, pagado: 0 });
        setPrevMonthTotals(prevSum);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setErrorMsg('No se pudo conectar a la base de datos (Supabase). Verifica que el proyecto esté activo y las credenciales en .env.local sean correctas.');
      setGastos([]);
      setTotals({ total: 0, pagado: 0, pendiente: 0 });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedMonth, selectedYear, setTotals, setPrevMonthTotals, sortConfig]);

  useEffect(() => {
    fetchGastos();
  }, [fetchGastos]);

  useEffect(() => {
    const fetchCuentas = async () => {
      const { data } = await supabase
        .from('cuentas')
        .select('*')
        .eq('activa', true)
        .order('nombre');
      if (data) setAllCuentas(data);
    };
    fetchCuentas();
  }, []);

  const handleAddGasto = async () => {
    if (!selectedNewCuenta) return;

    const { error } = await supabase
      .from('gastos_fijos')
      .insert([{
        cuenta_id: selectedNewCuenta,
        mes: selectedMonth,
        anio: selectedYear,
        monto: 0,
        pagado: false
      }]);

    if (!error) {
      setShowAddForm(false);
      setSelectedNewCuenta('');
      fetchGastos();
    } else {
      alert('Error al añadir gasto: ' + error.message);
    }
  };

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    setGastos(prev => prev.map(g => g.id === id ? { ...g, pagado: !currentStatus } : g));

    const nextGastos = gastos.map(g => g.id === id ? { ...g, pagado: !currentStatus } : g);
    const currentTotals = nextGastos.reduce((acc, curr) => {
      if (curr.pagado) acc.pagado += Number(curr.monto);
      else acc.pendiente += Number(curr.monto);
      acc.total += Number(curr.monto);
      return acc;
    }, { total: 0, pagado: 0, pendiente: 0 });
    setTotals(currentTotals);

    const { error } = await supabase
      .from('gastos_fijos')
      .update({ pagado: !currentStatus })
      .eq('id', id);
    if (error) fetchGastos(true);
  };

  const handleUpdateField = async (id: string, field: string, value: any) => {
    setGastos(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));

    const nextGastos = gastos.map(g => g.id === id ? { ...g, [field]: value } : g);
    const currentTotals = nextGastos.reduce((acc, curr) => {
      if (curr.pagado) acc.pagado += Number(curr.monto);
      else acc.pendiente += Number(curr.monto);
      acc.total += Number(curr.monto);
      return acc;
    }, { total: 0, pagado: 0, pendiente: 0 });
    setTotals(currentTotals);

    const { error } = await supabase
      .from('gastos_fijos')
      .update({ [field]: value })
      .eq('id', id);
    if (error) fetchGastos(true);
  };

  const handleDeleteGasto = async (id: string, cuentaNombre: string) => {
    if (!confirm(`¿Estás seguro que deseas eliminar el gasto de ${cuentaNombre} para este mes?`)) return;

    const { error } = await supabase
      .from('gastos_fijos')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchGastos(true);
    } else {
      alert('Error al eliminar gasto: ' + error.message);
    }
  };

  const handleLoadAllAccounts = async () => {
    if (!confirm(`¿Deseas cargar todas las cuentas activas para este mes?`)) return;

    setLoading(true);

    const { data: activeCuentas } = await supabase
      .from('cuentas')
      .select('id')
      .eq('activa', true);

    if (activeCuentas && activeCuentas.length > 0) {
      const existingAccountIds = new Set(gastos.map(g => g.cuenta_id));
      const toInsert = activeCuentas
        .filter(c => !existingAccountIds.has(c.id))
        .map(c => ({
          cuenta_id: c.id,
          mes: selectedMonth,
          anio: selectedYear,
          monto: 0,
          pagado: false
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('gastos_fijos').insert(toInsert);
        if (error) alert('Error al cargar cuentas: ' + error.message);
        else fetchGastos();
      } else {
        alert('Todas las cuentas activas ya están en este mes.');
      }
    }
    setLoading(false);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    
    setSortConfig({ key, direction });
    
    const sortedGastos = [...gastos].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];

      if (key === 'cuenta_nombre') {
        aValue = a.cuenta_nombre?.toLowerCase() ?? '';
        bValue = b.cuenta_nombre?.toLowerCase() ?? '';
      } else if (key === 'monto') {
        aValue = Number(a.monto);
        bValue = Number(b.monto);
      } else if (key === 'vencimiento') {
        aValue = a.vencimiento ? new Date(a.vencimiento).getTime() : 0;
        bValue = b.vencimiento ? new Date(b.vencimiento).getTime() : 0;
      } else if (key === 'pagado') {
        aValue = a.pagado ? 1 : 0;
        bValue = b.pagado ? 1 : 0;
      } else if (key === 'comentario') {
        aValue = a.comentario?.toLowerCase() ?? '';
        bValue = b.comentario?.toLowerCase() ?? '';
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setGastos(sortedGastos);
  };

  const filteredGastos = gastos.filter(g => {
    const matchesSearch = g.cuenta_nombre?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'paid' ? g.pagado : !g.pagado;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Tools Panel */}
      <header className="bg-panel p-3 rounded-2xl border border-border-subtle flex items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Filtrar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border-subtle pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-text-main text-xs transition-shadow"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-background p-1 rounded-xl border border-border-subtle shadow-inner">
            {(['all', 'paid', 'pending'] as const).map(s => (
              <button 
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all",
                  statusFilter === s ? "bg-panel text-primary shadow-sm" : "text-text-muted hover:text-text-main"
                )}
              >
                {s === 'all' ? 'Ver Todos' : s === 'paid' ? 'Pagados' : 'Pendientes'}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border-subtle mx-1" />

          {showAddForm ? (
            <div className="flex items-center gap-2 animate-in slide-in-from-right duration-300">
              <select 
                value={selectedNewCuenta}
                onChange={(e) => setSelectedNewCuenta(e.target.value)}
                className="bg-background border border-primary/50 px-4 py-2 rounded-xl text-text-main text-xs focus:outline-none ring-1 ring-primary/20"
              >
                <option value="">Cuenta...</option>
                {allCuentas
                  .filter(c => !gastos.some(g => g.cuenta_id === c.id))
                  .map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button 
                onClick={handleAddGasto}
                className="bg-primary text-background p-2 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-text-muted hover:text-white text-xs font-bold px-1"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 bg-panel border border-primary/30 text-primary px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-primary/5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Gasto
              </button>
              <button 
                onClick={handleLoadAllAccounts}
                className="flex items-center gap-2 bg-primary text-background px-4 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Cargar Todos
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Table Section */}
      <div className="bg-panel rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="text-text-muted text-[10px] uppercase font-black tracking-widest border-b border-border-subtle bg-white/5">
                <th className="px-5 py-3 w-[25%]">
                  <SortHeader label="Cuenta" sortKey="cuenta_nombre" currentSort={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-5 py-3 w-[20%]">
                  <SortHeader label="Monto ($)" sortKey="monto" currentSort={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-5 py-3 w-[15%]">
                  <SortHeader label="Venc." sortKey="vencimiento" currentSort={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-5 py-3 w-[10%] text-center">
                  <div className="flex items-center justify-center">
                    <SortHeader label="Pago" sortKey="pagado" currentSort={sortConfig} onSort={handleSort} />
                  </div>
                </th>
                <th className="px-5 py-3 w-[30%]">
                  <SortHeader label="Nota" sortKey="comentario" currentSort={sortConfig} onSort={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-20 text-[9px] font-black uppercase tracking-widest text-text-muted animate-pulse">Sincronizando...</td></tr>
              ) : errorMsg ? (
                <tr><td colSpan={5} className="text-center py-20 px-4 text-error/80 text-xs font-bold">{errorMsg}</td></tr>
              ) : filteredGastos.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-text-muted italic text-xs">No se encontraron gastos para este periodo.</td></tr>
              ) : (
                filteredGastos.map(g => (
                  <GastoRow 
                    key={g.id} 
                    gasto={g} 
                    onToggle={() => handleTogglePaid(g.id, g.pagado)} 
                    onUpdate={handleUpdateField}
                    onDelete={() => handleDeleteGasto(g.id, g.cuenta_nombre || '')}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SortHeader = ({ label, sortKey, currentSort, onSort }: { label: string, sortKey: string, currentSort: any, onSort: any }) => (
  <div 
    className="flex items-center gap-1 cursor-pointer hover:text-text-main select-none"
    onClick={() => onSort(sortKey)}
  >
    {label}
    {currentSort?.key === sortKey ? (
      currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-20" />
    )}
  </div>
);

const GastoRow: React.FC<{ 
  gasto: GastoWithCuenta; 
  onToggle: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: () => void;
}> = ({ gasto, onToggle, onUpdate, onDelete }) => {
  const isNearDue = gasto.vencimiento && !gasto.pagado && 
    differenceInDays(parseISO(gasto.vencimiento), new Date()) <= 3;

  return (
    <tr className={cn(
      "group transition-colors",
      !gasto.pagado ? (isNearDue ? "bg-warning/[0.04] hover:bg-warning/[0.06]" : "bg-warning/[0.01] hover:bg-white/[0.02]") : "opacity-60 grayscale-[0.3] hover:grayscale-0 hover:bg-white/[0.02]"
    )}>
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-col overflow-hidden">
            <span className={cn(
              "font-bold text-sm truncate",
              gasto.pagado ? "text-text-muted line-through" : "text-text-main"
            )}>{gasto.cuenta_nombre}</span>
            {gasto.cuenta_dato && (
              <span className={cn(
                "text-[9px] font-medium truncate mt-0.5",
                gasto.pagado ? "text-text-muted/50" : "text-primary/70"
              )}>{gasto.cuenta_dato}</span>
            )}
          </div>
          {isNearDue && <AlertTriangle className="w-3.5 h-3.5 text-warning animate-pulse shrink-0" />}
        </div>
      </td>
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-1 group/input">
          <span className="text-text-muted font-bold text-xs">$</span>
          <input 
            type="number"
            defaultValue={gasto.monto}
            onBlur={(e) => onUpdate(gasto.id, 'monto', Number(e.target.value))}
            className="bg-transparent border-b border-transparent group-hover/input:border-primary/20 focus:border-primary focus:ring-0 px-0.5 text-sm text-text-main w-full font-mono transition-all outline-none"
          />
        </div>
      </td>
      <td className="px-5 py-2.5">
        <input 
          type="date"
          defaultValue={gasto.vencimiento || ''}
          onChange={(e) => onUpdate(gasto.id, 'vencimiento', e.target.value)}
          className={cn(
            "bg-transparent border-none focus:ring-0 text-xs text-text-muted transition-all cursor-pointer hover:text-text-main p-0",
            !gasto.pagado && isNearDue && "text-warning font-bold"
          )}
        />
      </td>
      <td className="px-5 py-2.5 text-center">
        <button 
          onClick={onToggle}
          className={cn(
            "w-8 h-4 rounded-full p-0.5 transition-all duration-300 flex items-center shadow-inner mx-auto",
            gasto.pagado ? "bg-primary justify-end" : "bg-border-subtle justify-start"
          )}
        >
          <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
        </button>
      </td>
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-2">
          <input 
            type="text"
            defaultValue={gasto.comentario || ''}
            onBlur={(e) => onUpdate(gasto.id, 'comentario', e.target.value)}
            placeholder="..."
            className="bg-transparent border-none focus:ring-0 text-text-main text-sm w-full transition-all italic placeholder:opacity-20 hover:placeholder:opacity-50 p-0 font-medium"
          />
          <button 
            onClick={onDelete}
            title="Eliminar gasto"
            className="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-error/10 flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
