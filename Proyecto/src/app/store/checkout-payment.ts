import type { PaymentMethod } from './api';

export const demoHolders = ['Cliente de prueba', 'Jugador ficticio', 'Titular de demostración'];
const firstYear = 2027;
const msPerDay = 24 * 60 * 60 * 1000;

export function minimumCardMonth(now = new Date()): string {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const minimum = new Date(Math.max(Date.UTC(firstYear, 0, 1), today + 30 * msPerDay));
  return minimum.toISOString().slice(0, 7);
}

function validCardNumber(number: string): boolean {
  if (!/^[1-9][0-9]{15}$/.test(number)) return false;
  let sum = 0;
  for (let position = 0; position < number.length; position++) {
    const digit = Number(number[position]);
    const amount = position % 2 === 0 ? digit * 2 : digit;
    sum += amount > 9 ? amount - 9 : amount;
  }
  return sum % 10 === 0;
}

export function validateDemoPayment(data: Record<string,string>): PaymentMethod {
  if (data['paymentMethod'] === 'paypal') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data['paypalEmail']?.trim() ?? '')) {
      throw new Error('Escribe un correo de prueba válido para PayPal.');
    }
    return 'paypal';
  }
  if (data['paymentMethod'] !== 'card') throw new Error('Selecciona Tarjeta o PayPal.');
  if (!demoHolders.includes(data['cardholder'])) throw new Error('Selecciona un titular ficticio.');
  if (!validCardNumber(data['cardNumber'] ?? '')) throw new Error('Escribe un número de tarjeta ficticio de 16 dígitos con dígito de control válido.');
  if (!/^[0-9]{3}$/.test(data['cardCode'] ?? '')) throw new Error('Escribe un código de seguridad de tres dígitos.');
  const expiry = data['cardExpiry'] ?? '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(expiry) || expiry < minimumCardMonth()) {
    throw new Error('Usa una fecha desde enero de 2027 con al menos 30 días de vigencia.');
  }
  return 'card';
}
