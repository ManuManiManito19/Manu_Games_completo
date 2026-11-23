import type { PaymentMethod } from './api';

export const demoCard = '4242424242424242';
export const demoCode = '123';
const firstYear = 2026;
const msPerDay = 24 * 60 * 60 * 1000;

export function minimumCardMonth(now = new Date()): string {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const minimum = new Date(Math.max(Date.UTC(firstYear, 0, 1), today + 30 * msPerDay));
  return minimum.toISOString().slice(0, 7);
}

export function validateDemoPayment(data: Record<string,string>): PaymentMethod {
  if (data['paymentMethod'] === 'paypal') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data['paypalEmail']?.trim() ?? '')) {
      throw new Error('Escribe un correo de prueba válido para PayPal.');
    }
    return 'paypal';
  }
  if (data['paymentMethod'] !== 'card') throw new Error('Selecciona Tarjeta o PayPal.');
  const holder = data['cardholder']?.trim() ?? '';
  if (holder.length < 2 || holder.length > 90) throw new Error('Escribe el nombre del titular de prueba.');
  if (data['cardNumber']?.replaceAll(' ', '') !== demoCard || data['cardCode'] !== demoCode) {
    throw new Error('Usa el número 4242 4242 4242 4242 y el código 123 de la tarjeta de prueba.');
  }
  const expiry = data['cardExpiry'] ?? '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(expiry) || expiry < minimumCardMonth()) {
    throw new Error('Usa una fecha desde 2026 con al menos 30 días de vigencia.');
  }
  return 'card';
}
