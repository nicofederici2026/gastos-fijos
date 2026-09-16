import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { Accounts } from './components/Accounts';
import { ImportTool } from './components/ImportTool';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'accounts' | 'import'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [totals, setTotals] = useState({ total: 0, pagado: 0, pendiente: 0 });
  const [prevMonthTotals, setPrevMonthTotals] = useState({ total: 0, pagado: 0 });

  return (
    <div className="flex min-h-screen bg-background text-text-main font-sans selection:bg-primary selection:text-background">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        totals={totals}
        prevMonthTotals={prevMonthTotals}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
          <header className="flex flex-col gap-2">
            <h2 className="text-3xl font-black tracking-tight text-white">
              {activeTab === 'dashboard' && 'Vencimientos del Mes'}
              {activeTab === 'history' && 'Histórico de Gastos'}
              {activeTab === 'accounts' && 'Gestión de Cuentas'}
              {activeTab === 'import' && 'Importación Masiva'}
            </h2>
            <p className="text-text-muted font-medium">
              {activeTab === 'dashboard' && 'Administra y controla tus pagos mensuales de forma sencilla.'}
              {activeTab === 'history' && 'Consulta la evolución de tus gastos a través del tiempo.'}
              {activeTab === 'accounts' && 'Configura tus cuentas recurrentes y categorías de gasto.'}
              {activeTab === 'import' && 'Carga rápidamente tu historial de gastos desde Excel.'}
            </p>
          </header>

          <div className="mt-8 transition-all duration-300">
            {activeTab === 'dashboard' && (
              <Dashboard 
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                setTotals={setTotals}
                setPrevMonthTotals={setPrevMonthTotals}
              />
            )}
            {activeTab === 'history' && <History />}
            {activeTab === 'accounts' && <Accounts />}
            {activeTab === 'import' && <ImportTool />}
          </div>
        </div>
      </main>

      {/* Background Decorative Element */}
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3" />
    </div>
  );
}

export default App;
