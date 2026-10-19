import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}

export function formatNumberARS(num: number): string {
  if (num === 0 || isNaN(num) || num === null || num === undefined) return '0,00';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function parseNumberARS(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function formatLiveARS(val: string): string {
  let clean = val.replace(/[^\d.,]/g, '');
  if (clean.includes('.') && !clean.includes(',')) {
    clean = clean.replace('.', ',');
  } else {
    clean = clean.replace(/\./g, '');
  }
  const [intPart = '', decPart] = clean.split(',');
  const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  if (decPart !== undefined) {
    return `${formattedInt || '0'},${decPart.slice(0, 2)}`;
  }
  return formattedInt;
}

export function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return '-';
}

export function formatDateDDMM(dateStr: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [, month, day] = parts;
    return `${day}/${month}`;
  }
  return '';
}

export function parseDateDDMM(str: string, year: number, fallbackMonth: number): string | null {
  if (!str || !str.trim()) return null;
  const clean = str.replace(/[^\d/]/g, '').trim();
  const parts = clean.split('/');
  let day = parseInt(parts[0], 10);
  let month = parts[1] ? parseInt(parts[1], 10) : fallbackMonth;
  if (isNaN(day) || day < 1 || day > 31) return null;
  if (isNaN(month) || month < 1 || month > 12) month = fallbackMonth;
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}

