import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database, AlertCircle, CheckCircle2, Loader2, Info, Download } from 'lucide-react';

export const ImportTool: React.FC = () => {
  const [rawData, setRawData] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [cuentasMap, setCuentasMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCuentas = async () => {
      const { data } = await supabase.from('cuentas').select('id, nombre');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(c => {
          map[c.nombre.toLowerCase().trim()] = c.id;
        });
        setCuentasMap(map);
      }
    };
    fetchCuentas();
  }, []);

  const handleImport = async () => {
    if (!rawData.trim()) return;
    setStatus('loading');
    setMessage('Procesando datos...');

    try {
      // Logic: Split by lines, then by tabs (standard copy-paste from Excel) or semicolon/comma
      const lines = rawData.trim().split('\n');
      const rows = lines.slice(0); // If user doesn't paste header, slice(0). If have header, slice(1).
      // Let's assume NO header for simplicity, or we can detect it. 
      // Re-reading instructions, I told user to copy WITHOUT header.
      
      
      const toInsert: any[] = [];
      const errors: string[] = [];

      rows.forEach((line, index) => {
        const parts = line.split('\t'); // Try tab first
        if (parts.length < 2) return; // Skip empty/invalid

        // Expected structure: nombre, anio, mes, monto, vencimiento, pagado, comentario
        const [nombre, anio, mes, monto, vencimiento, pagado, comentario] = parts.map(p => p.trim());
        
        const cuentaId = cuentasMap[nombre.toLowerCase()];
        if (!cuentaId) {
          errors.push(`Fila ${index + 2}: Cuenta "${nombre}" no encontrada.`);
          return;
        }

        toInsert.push({
          cuenta_id: cuentaId,
          anio: parseInt(anio),
          mes: parseInt(mes),
          monto: parseFloat(monto.replace(',', '.')),
          vencimiento: vencimiento || null,
          pagado: pagado.toLowerCase() === 'true' || pagado === '1',
          comentario: comentario || ''
        });
      });

      if (errors.length > 0) {
        setStatus('error');
        setMessage(errors.join('\n'));
        return;
      }

      const { error } = await supabase.from('gastos_fijos').insert(toInsert);

      if (error) throw error;

      setStatus('success');
      setMessage(`¡Éxito! Se importaron ${toInsert.length} registros correctamente.`);
      setRawData('');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage('Error de importación: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleExport = async () => {
    setStatus('loading');
    setMessage('Generando archivo de exportación...');
    
    try {
      const { data, error } = await supabase
        .from('gastos_fijos')
        .select('*, cuentas(nombre)')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No hay datos para exportar.');
      }

      // CSV Headers
      const headers = ['cuenta_nombre', 'anio', 'mes', 'monto', 'vencimiento', 'pagado', 'comentario'];
      const csvRows = [headers.join('\t')];

      data.forEach(g => {
        const row = [
          g.cuentas?.nombre || 'Sin nombre',
          g.anio,
          g.mes,
          g.monto,
          g.vencimiento || '',
          g.pagado ? 'TRUE' : 'FALSE',
          (g.comentario || '').replace(/\t/g, ' ') // Remove tabs from comments
        ];
        csvRows.push(row.join('\t'));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/tab-separated-values;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `gastos_fijos_export_${new Date().toISOString().split('T')[0]}.xls`); 
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus('success');
      setMessage(`Exportación completada: ${data.length} registros.`);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage('Error al exportar: ' + (err.message || 'Error desconocido'));
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="bg-panel p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-primary">
          <Database className="w-6 h-6" />
          <h3 className="text-xl font-bold text-white">Importador de Historial</h3>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex gap-3">
          <Info className="w-5 h-5 text-primary shrink-0" />
          <div className="text-xs text-text-muted leading-relaxed">
            <p className="font-bold text-primary mb-1 uppercase tracking-widest text-[9px]">Instrucciones:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Prepara tus datos en Excel o Google Sheets con las columnas en este orden:</li>
              <li className="font-mono text-primary bg-background/50 px-2 py-0.5 rounded inline-block">Nombre de Cuenta, Año, Mes, Monto, Vencimiento, Pagado, Comentario</li>
              <li>Copia las filas (sin el encabezado) y pégalas en el cuadro de abajo.</li>
              <li>Asegúrate de que los nombres de las cuentas coincidan exactamente con la sección "Cuentas".</li>
            </ol>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-text-muted tracking-widest px-1">Datos a importar (pestañas o Excel)</label>
          <textarea
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder="Pega aquí tus datos..."
            className="w-full h-64 bg-background border border-border-subtle rounded-xl p-4 text-xs font-mono text-text-main focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {status === 'loading' && (
              <div className="flex items-center gap-2 text-primary text-xs font-bold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </div>
            )}
            {status === 'success' && (
              <div className="flex items-center gap-2 text-primary text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                {message}
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-start gap-2 text-error text-xs font-bold max-w-md">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">{message}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={status === 'loading'}
              className="bg-panel border border-border-subtle text-text-main px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all disabled:opacity-30 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Actual
            </button>
            <button
              onClick={handleImport}
              disabled={status === 'loading' || !rawData.trim()}
              className="bg-primary text-background px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-primary/10"
            >
              {status === 'loading' ? 'Importando...' : 'Iniciar Importación'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <p className="text-[9px] font-bold text-text-muted uppercase mb-2">Formato de Fecha</p>
          <p className="text-xs text-text-main italic font-mono">YYYY-MM-DD (ej: 2024-05-30)</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <p className="text-[9px] font-bold text-text-muted uppercase mb-2">Valores Lógicos (Pagado)</p>
          <p className="text-xs text-text-main font-mono">TRUE / FALSE / 1 / 0</p>
        </div>
      </div>
    </div>
  );
};
