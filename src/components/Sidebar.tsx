import React from 'react';
import { LayoutDashboard, History, Settings, PlusCircle, CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: 'dashboard' | 'history' | 'accounts' | 'import';
  setActiveTab: (tab: 'dashboard' | 'history' | 'accounts' | 'import') => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  totals: { total: number; pagado: number; pendiente: number };
  prevMonthTotals: { total: number; pagado: number };
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  totals,
  prevMonthTotals
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Vencimientos', icon: LayoutDashboard },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'accounts', label: 'Cuentas', icon: Settings },
    { id: 'import', label: 'Importar', icon: PlusCircle },
  ];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  return (
    <aside className="w-64 bg-panel border-r border-border-subtle flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-6 border-b border-border-subtle">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <PlusCircle className="w-6 h-6" />
          Gastos Fijos
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Month/Year Selectors */}
        <div className="bg-panel/40 p-3 rounded-2xl border border-border-subtle group hover:border-primary/30 transition-all flex flex-col gap-2 relative shadow-sm">
          <div className="flex items-center gap-2 mb-0.5 px-0.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] uppercase font-black text-text-muted tracking-widest">Periodo</span>
          </div>
          <div className="flex gap-2 relative">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-3/5 appearance-none bg-background border border-border-subtle px-3 py-2.5 flex-1 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-inner hover:bg-white/5 transition-all capitalize"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es', { month: 'long' })}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-2/5 appearance-none bg-background border border-border-subtle px-3 py-2.5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-inner text-center hover:bg-white/5 transition-all flex-shrink-0"
            >
              {[2026, 2027, 2028, 2029].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <nav className="space-y-1">
          <p className="text-[10px] uppercase font-black text-text-muted px-1 tracking-widest mb-2">Menú</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left",
                activeTab === item.id 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-text-muted hover:bg-white/5 hover:text-text-main"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1" />

      <div className="p-4 bg-background/50 border-t border-border-subtle space-y-3">
        <p className="text-[10px] uppercase font-black text-text-muted px-1 tracking-widest">Resumen Mensual</p>
        
        <div className="space-y-2">
          <div className="bg-panel/50 p-3 rounded-xl border border-border-subtle">
            <p className="text-[10px] text-text-muted font-bold uppercase">Total del Mes</p>
            <p className="text-lg font-black text-text-main">{formatCurrency(totals.total)}</p>
            {prevMonthTotals.total > 0 && (
              <p className={cn(
                "text-[10px] font-bold mt-1",
                totals.total > prevMonthTotals.total ? "text-red-400" : "text-primary"
              )}>
                {totals.total > prevMonthTotals.total ? '↑' : '↓'} {Math.abs(Math.round(((totals.total - prevMonthTotals.total) / prevMonthTotals.total) * 100))}% vs mes ant.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-panel/50 p-2.5 rounded-xl border border-border-subtle">
              <p className="text-[9px] text-primary font-bold uppercase">Pagado</p>
              <p className="text-xs font-black text-text-main">{formatCurrency(totals.pagado)}</p>
            </div>
            <div className="bg-panel/50 p-2.5 rounded-xl border border-border-subtle">
              <p className="text-[9px] text-warning font-bold uppercase">Pendiente</p>
              <p className="text-xs font-black text-text-main">{formatCurrency(totals.pendiente)}</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 bg-white/5 rounded-lg">
          <p className="text-[9px] text-text-muted uppercase tracking-widest font-bold">App Status</p>
          <p className="text-[10px] text-text-main font-semibold">Online & Connected</p>
        </div>
      </div>
    </aside>
  );
};
