import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { GastoWithCuenta } from '../types';
import { 
  cn, 
  formatNumberARS, 
  parseNumberARS, 
  formatLiveARS, 
  formatDateDDMM, 
  parseDateDDMM 
} from '../lib/utils';
import { 
  Search, 
  CheckSquare, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  GripVertical, 
  ChevronUp, 
  ChevronDown,
  RotateCcw
} from 'lucide-react';
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const orderStorageKey = `gastos_manual_order_${selectedYear}_${selectedMonth}`;

  const fetchGastos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      // Consultamos sin ordenar por vencimiento para respetar el orden manual
      const { data, error } = await supabase
        .from('gastos_fijos')
        .select('*, cuentas(*)')
        .eq('mes', selectedMonth)
        .eq('anio', selectedYear);

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        let mapped: GastoWithCuenta[] = data.map(g => ({
          ...g,
          cuenta_nombre: g.cuentas?.nombre,
          cuenta_dato: g.cuentas?.dato
        }));

        if (sortConfig) {
          // Orden temporal si el usuario hace clic explícito en una cabecera
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
        } else {
          // Orden Manual persistido en localStorage
          const savedOrder: string[] = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
          const globalCuentaOrder: string[] = JSON.parse(localStorage.getItem('cuentas_manual_order') || '[]');

          mapped = mapped.sort((a, b) => {
            const idxA = savedOrder.indexOf(a.id);
            const idxB = savedOrder.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;

            const cIdxA = globalCuentaOrder.indexOf(a.cuenta_id);
            const cIdxB = globalCuentaOrder.indexOf(b.cuenta_id);
            if (cIdxA !== -1 && cIdxB !== -1) return cIdxA - cIdxB;
            if (cIdxA !== -1) return -1;
            if (cIdxB !== -1) return 1;

            return (a.created_at || '').localeCompare(b.created_at || '');
          });
        }

        setGastos(mapped);

        // Recalcular totales para el Sidebar
        const currentTotals = mapped.reduce((acc, curr) => {
          if (curr.pagado) acc.pagado += Number(curr.monto);
          else acc.pendiente += Number(curr.monto);
          acc.total += Number(curr.monto);
          return acc;
        }, { total: 0, pagado: 0, pendiente: 0 });
        setTotals(currentTotals);
      }

      // Comparación con mes anterior
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
      setErrorMsg('No se pudo conectar a la base de datos (Supabase).');
      setGastos([]);
      setTotals({ total: 0, pagado: 0, pendiente: 0 });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedMonth, selectedYear, setTotals, setPrevMonthTotals, sortConfig, orderStorageKey]);

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

    const { data, error } = await supabase
      .from('gastos_fijos')
      .insert([{
        cuenta_id: selectedNewCuenta,
        mes: selectedMonth,
        anio: selectedYear,
        monto: 0,
        pagado: false
      }])
      .select('*, cuentas(*)');

    if (!error && data && data.length > 0) {
      setShowAddForm(false);
      setSelectedNewCuenta('');
      
      const newGasto: GastoWithCuenta = {
        ...data[0],
        cuenta_nombre: data[0].cuentas?.nombre,
        cuenta_dato: data[0].cuentas?.dato
      };
      
      setGastos(prev => {
        const updated = [...prev, newGasto];
        localStorage.setItem(orderStorageKey, JSON.stringify(updated.map(g => g.id)));
        localStorage.setItem('cuentas_manual_order', JSON.stringify(updated.map(g => g.cuenta_id)));
        return updated;
      });
    } else if (error) {
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

    await supabase
      .from('gastos_fijos')
      .update({ pagado: !currentStatus })
      .eq('id', id);
  };

  const handleUpdateField = async (id: string, field: string, value: any) => {
    // Actualización local sin alterar el orden
    setGastos(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));

    const nextGastos = gastos.map(g => g.id === id ? { ...g, [field]: value } : g);
    const currentTotals = nextGastos.reduce((acc, curr) => {
      if (curr.pagado) acc.pagado += Number(curr.monto);
      else acc.pendiente += Number(curr.monto);
      acc.total += Number(curr.monto);
      return acc;
    }, { total: 0, pagado: 0, pendiente: 0 });
    setTotals(currentTotals);

    await supabase
      .from('gastos_fijos')
      .update({ [field]: value })
      .eq('id', id);
  };

  const handleDeleteGasto = async (id: string, cuentaNombre: string) => {
    if (!confirm(`¿Estás seguro que deseas eliminar el gasto de ${cuentaNombre} para este mes?`)) return;

    setGastos(prev => {
      const updated = prev.filter(g => g.id !== id);
      localStorage.setItem(orderStorageKey, JSON.stringify(updated.map(g => g.id)));
      return updated;
    });

    await supabase
      .from('gastos_fijos')
      .delete()
      .eq('id', id);
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

  // Reordenar a mano: Mover Arriba / Abajo
  const handleMoveGasto = (id: string, direction: 'up' | 'down') => {
    setSortConfig(null);
    setGastos(prev => {
      const index = prev.findIndex(g => g.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);

      localStorage.setItem(orderStorageKey, JSON.stringify(updated.map(g => g.id)));
      localStorage.setItem('cuentas_manual_order', JSON.stringify(updated.map(g => g.cuenta_id)));
      return updated;
    });
  };

  // Reordenar a mano: Drag and Drop
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    setSortConfig(null);
    setGastos(prev => {
      const sourceIndex = prev.findIndex(g => g.id === draggedId);
      const targetIndex = prev.findIndex(g => g.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);

      localStorage.setItem(orderStorageKey, JSON.stringify(updated.map(g => g.id)));
      localStorage.setItem('cuentas_manual_order', JSON.stringify(updated.map(g => g.cuenta_id)));
      return updated;
    });
    setDraggedId(null);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const resetToManualOrder = () => {
    setSortConfig(null);
    fetchGastos();
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
      <header className="bg-panel p-3 rounded-2xl border border-border-subtle flex flex-wrap items-center justify-between gap-3 shadow-sm">
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
          {sortConfig && (
            <button
              onClick={resetToManualOrder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-border-subtle text-primary hover:bg-white/10 text-xs font-bold transition-all"
              title="Volver al orden manual personalizado"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer orden manual</span>
            </button>
          )}

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
                <th className="px-3 py-3 w-16 text-center" title="Arrastra o usa las flechas para ordenar a mano">
                  <span className="opacity-70">Orden</span>
                </th>
                <th className="px-5 py-3 w-[26%]">
                  <SortHeader label="Cuenta" sortKey="cuenta_nombre" currentSort={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-5 py-3 w-[26%]">
                  <SortHeader label="Monto ($)" sortKey="monto" currentSort={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 w-[16%] text-center">
                  <div className="flex items-center justify-center">
                    <SortHeader label="Venc. (DD/MM)" sortKey="vencimiento" currentSort={sortConfig} onSort={handleSort} />
                  </div>
                </th>
                <th className="px-4 py-3 w-[10%] text-center">
                  <div className="flex items-center justify-center">
                    <SortHeader label="Pago" sortKey="pagado" currentSort={sortConfig} onSort={handleSort} />
                  </div>
                </th>
                <th className="px-5 py-3 w-[22%]">
                  <SortHeader label="Nota" sortKey="comentario" currentSort={sortConfig} onSort={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20 text-[9px] font-black uppercase tracking-widest text-text-muted animate-pulse">Sincronizando...</td></tr>
              ) : errorMsg ? (
                <tr><td colSpan={6} className="text-center py-20 px-4 text-error/80 text-xs font-bold">{errorMsg}</td></tr>
              ) : filteredGastos.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-text-muted italic text-xs">No se encontraron gastos para este periodo.</td></tr>
              ) : (
                filteredGastos.map((g, index) => (
                  <GastoRow 
                    key={g.id} 
                    gasto={g}
                    index={index}
                    totalRows={filteredGastos.length}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onToggle={() => handleTogglePaid(g.id, g.pagado)} 
                    onUpdate={handleUpdateField}
                    onDelete={() => handleDeleteGasto(g.id, g.cuenta_nombre || '')}
                    onMoveUp={() => handleMoveGasto(g.id, 'up')}
                    onMoveDown={() => handleMoveGasto(g.id, 'down')}
                    onDragStart={() => handleDragStart(g.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(g.id)}
                    isDragged={draggedId === g.id}
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
      currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-20" />
    )}
  </div>
);

// Componente para escribir el monto con formato argentino y fuente grande
const MontoInput: React.FC<{
  value: number;
  onSave: (val: number) => void;
}> = ({ value, onSave }) => {
  const [text, setText] = useState<string>(() => formatNumberARS(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(formatNumberARS(value));
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Si es 0, dejamos la caja vacía para que escribir 124250 empiece limpio sin pelear con "0,00"
    if (!value || value === 0) {
      setText('');
    } else {
      // Si es un entero, mostramos solo la parte entera formateada con puntos (ej. 124.250)
      if (Number.isInteger(value)) {
        setText(formatLiveARS(String(value)));
      } else {
        setText(formatNumberARS(value));
      }
    }
    const target = e.target;
    setTimeout(() => {
      target.select();
    }, 15);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const live = formatLiveARS(e.target.value);
    setText(live);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseNumberARS(text);
    setText(formatNumberARS(parsed));
    if (parsed !== value) {
      onSave(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-center gap-1.5 group/input bg-black/15 hover:bg-black/30 focus-within:bg-black/40 border border-transparent hover:border-border-subtle focus-within:border-primary/50 px-2.5 py-1.5 rounded-xl transition-all">
      <span className="text-primary font-black text-base select-none">$</span>
      <input 
        type="text"
        inputMode="decimal"
        value={isFocused ? text : formatNumberARS(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="0,00"
        className="bg-transparent border-none focus:ring-0 p-0 text-base sm:text-lg font-extrabold text-white w-full font-mono transition-all outline-none placeholder:text-text-muted/40 tracking-tight"
      />
    </div>
  );
};

// Componente para vencimiento en formato exclusivo DD/MM
const VencimientoInput: React.FC<{
  value: string | null;
  selectedYear: number;
  selectedMonth: number;
  isNearDue: boolean;
  pagado: boolean;
  onSave: (dateIso: string | null) => void;
}> = ({ value, selectedYear, selectedMonth, isNearDue, pagado, onSave }) => {
  const [text, setText] = useState<string>(() => formatDateDDMM(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(formatDateDDMM(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d/]/g, '');
    // Insertar automáticamente la barra al escribir los dos dígitos del día
    if (val.length === 2 && !val.includes('/') && !text.includes('/')) {
      val = `${val}/`;
    }
    if (val.length <= 5) {
      setText(val);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!text.trim()) {
      setText('');
      if (value !== null) onSave(null);
      return;
    }

    const parsed = parseDateDDMM(text, selectedYear, selectedMonth);
    if (parsed) {
      setText(formatDateDDMM(parsed));
      if (parsed !== value) {
        onSave(parsed);
      }
    } else {
      // Revertir a valor anterior si ingresó fecha inválida
      setText(formatDateDDMM(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center justify-center rounded-xl border px-2.5 py-1.5 transition-all shadow-inner",
      !pagado && isNearDue 
        ? "bg-warning/10 border-warning/40 text-warning" 
        : "bg-black/15 hover:bg-black/30 focus-within:bg-black/40 border-transparent hover:border-border-subtle focus-within:border-primary/50 text-text-main"
    )}>
      <input
        type="text"
        value={text}
        onChange={handleChange}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.select();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="DD/MM"
        maxLength={5}
        className={cn(
          "bg-transparent border-none focus:ring-0 p-0 text-center text-xs sm:text-sm font-bold font-mono tracking-wider w-16 outline-none transition-colors placeholder:text-text-muted/40",
          !pagado && isNearDue ? "text-warning font-black" : "text-text-main"
        )}
      />
    </div>
  );
};

const GastoRow: React.FC<{ 
  gasto: GastoWithCuenta; 
  index: number;
  totalRows: number;
  selectedYear: number;
  selectedMonth: number;
  onToggle: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragged: boolean;
}> = ({ 
  gasto, 
  index, 
  totalRows,
  selectedYear, 
  selectedMonth, 
  onToggle, 
  onUpdate, 
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDragged
}) => {
  const isNearDue = Boolean(
    gasto.vencimiento && 
    !gasto.pagado && 
    differenceInDays(parseISO(gasto.vencimiento), new Date()) <= 3
  );

  return (
    <tr 
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "group transition-all duration-150",
        isDragged && "opacity-40 bg-primary/10",
        !gasto.pagado ? (isNearDue ? "bg-warning/[0.04] hover:bg-warning/[0.06]" : "bg-warning/[0.01] hover:bg-white/[0.02]") : "opacity-65 grayscale-[0.25] hover:grayscale-0 hover:bg-white/[0.02]"
      )}
    >
      {/* Controles de orden manual (arrastrar o botones arriba/abajo) */}
      <td className="px-2 py-2.5 text-center">
        <div className="flex items-center justify-center gap-0.5 select-none">
          <div 
            className="cursor-grab active:cursor-grabbing text-text-muted/40 hover:text-text-muted p-0.5 rounded transition-colors"
            title="Arrastra para reordenar a mano"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="text-text-muted/40 hover:text-primary disabled:opacity-10 disabled:pointer-events-none p-0.5 transition-colors"
              title="Subir"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalRows - 1}
              className="text-text-muted/40 hover:text-primary disabled:opacity-10 disabled:pointer-events-none p-0.5 transition-colors"
              title="Bajar"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </td>

      {/* Cuenta */}
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

      {/* Monto con formato automático y fuente grande */}
      <td className="px-5 py-2.5">
        <MontoInput 
          value={Number(gasto.monto) || 0}
          onSave={(newMonto) => onUpdate(gasto.id, 'monto', newMonto)}
        />
      </td>

      {/* Vencimiento sólo DD/MM */}
      <td className="px-4 py-2.5 text-center">
        <VencimientoInput
          value={gasto.vencimiento}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          isNearDue={isNearDue}
          pagado={gasto.pagado}
          onSave={(newDateIso) => onUpdate(gasto.id, 'vencimiento', newDateIso)}
        />
      </td>

      {/* Toggle de Pago */}
      <td className="px-4 py-2.5 text-center">
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

      {/* Nota y acción de eliminar */}
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            defaultValue={gasto.comentario || ''}
            onBlur={(e) => onUpdate(gasto.id, 'comentario', e.target.value)}
            placeholder="..."
            className="bg-transparent border-none focus:ring-0 text-text-main text-xs sm:text-sm w-full transition-all italic placeholder:opacity-20 hover:placeholder:opacity-50 p-0 font-medium"
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
