import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Cuenta } from '../types';
import { Plus, Edit2, Check, X, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export const Accounts: React.FC = () => {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [newCuentaNombre, setNewCuentaNombre] = useState('');
  const [newCuentaDato, setNewCuentaDato] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDato, setEditDato] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCuentas();
  }, []);

  const fetchCuentas = async () => {
    const { data } = await supabase.from('cuentas').select('*').order('nombre');
    if (data) setCuentas(data);
  };

  const handleAddCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCuentaNombre.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('cuentas').insert([{ 
      nombre: newCuentaNombre.trim(),
      dato: newCuentaDato.trim() || null
    }]);
    if (!error) {
      setNewCuentaNombre('');
      setNewCuentaDato('');
      fetchCuentas();
    }
    setLoading(false);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('cuentas').update({ activa: !current }).eq('id', id);
    if (!error) fetchCuentas();
  };

  const handleStartEdit = (cuenta: Cuenta) => {
    setEditingId(cuenta.id);
    setEditNombre(cuenta.nombre);
    setEditDato(cuenta.dato || '');
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase.from('cuentas').update({ 
      nombre: editNombre.trim(),
      dato: editDato.trim() || null
    }).eq('id', id);
    if (!error) {
      setEditingId(null);
      fetchCuentas();
    }
  };

  const handleDeleteCuenta = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro que deseas borrar la cuenta "${nombre}"? Esto podría fallar si tiene gastos asociados.`)) return;
    
    const { error } = await supabase.from('cuentas').delete().eq('id', id);
    
    if (!error) {
      fetchCuentas();
    } else {
      alert('Error al borrar cuenta: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Add Account Card */}
      <section className="bg-panel p-4 rounded-2xl border border-border-subtle shadow-sm">
        <h3 className="text-text-main text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-primary" />
          Nueva Cuenta
        </h3>
        <form onSubmit={handleAddCuenta} className="flex flex-col sm:flex-row gap-2">
          <input 
            type="text" 
            value={newCuentaNombre}
            onChange={(e) => setNewCuentaNombre(e.target.value)}
            placeholder="Ej: Alquiler, Tarjeta Visa..."
            className="flex-1 bg-background border border-border-subtle px-3 py-2 rounded-xl text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input 
            type="text" 
            value={newCuentaDato}
            onChange={(e) => setNewCuentaDato(e.target.value)}
            placeholder="Dato/Alias (opcional)"
            className="flex-1 bg-background border border-border-subtle px-3 py-2 rounded-xl text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-primary text-background px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
      </section>

      {/* List Accounts Card */}
      <div className="bg-panel rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-text-main text-[10px] font-black uppercase tracking-widest">Gestión de Cuentas</h3>
          <span className="text-text-muted text-[10px] font-bold">{cuentas.length} Total</span>
        </div>

        <div className="divide-y divide-border-subtle">
          {cuentas.map(c => (
            <div key={c.id} className="px-4 py-2 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
              <div className="flex-1 flex items-center gap-4">
                {editingId === c.id ? (
                  <div className="flex flex-col w-full max-w-sm gap-1">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        placeholder="Nombre"
                        className="flex-1 bg-background border border-primary px-2 py-1 rounded text-text-main text-sm focus:outline-none"
                      />
                      <button onClick={() => handleSaveEdit(c.id)} className="text-primary hover:bg-primary/10 p-1 rounded-lg"><Check className="w-4 h-4"/></button>
                      <button onClick={() => setEditingId(null)} className="text-text-muted hover:bg-white/10 p-1 rounded-lg"><X className="w-4 h-4"/></button>
                    </div>
                    <input 
                      type="text" 
                      value={editDato}
                      onChange={(e) => setEditDato(e.target.value)}
                      placeholder="Dato/Alias (opcional)"
                      className="w-full bg-background border border-border-subtle px-2 py-1 rounded text-text-muted text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-3">
                      <span className={cn("text-sm font-bold", !c.activa ? "text-text-muted line-through" : "text-text-main")}>{c.nombre}</span>
                      {!c.activa && <span className="bg-white/5 text-text-muted px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ring-1 ring-white/10">Inactiva</span>}
                      <button onClick={() => handleStartEdit(c)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {c.dato && <span className="text-xs text-text-muted italic">{c.dato}</span>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleToggleActive(c.id, c.activa)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ring-1",
                    c.activa 
                      ? "bg-primary/5 text-primary ring-primary/20 hover:bg-primary/10" 
                      : "bg-warning/5 text-warning ring-warning/20 hover:bg-warning/10"
                  )}
                >
                  {c.activa ? 'Activa' : 'Reactivar'}
                </button>
                <button 
                  onClick={() => handleDeleteCuenta(c.id, c.nombre)}
                  className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Borrar cuenta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {cuentas.length === 0 && (
            <div className="p-8 text-center text-text-muted italic text-xs">No hay cuentas registradas.</div>
          )}
        </div>
      </div>
    </div>
  );
};
