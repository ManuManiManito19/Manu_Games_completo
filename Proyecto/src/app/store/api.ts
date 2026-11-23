import { Injectable } from '@angular/core';
import { firebasePreview } from './preview-mode';
import { SparkApi } from './spark-api';

export interface User { id: number | string; name: string; email: string; role: 'client' | 'admin'; avatar: string; }
export interface Category { id: number; name: string; active: number; }
export interface Product {
  id: number; sku: string; name: string; family: string; description: string; platform: string;
  category: string; category_id: number; price: number; stock: number; active: number; image: string;
  variants?: Product[];
}
export interface Cart {
  items: (Product & {quantity: number})[]; subtotal: number;
}
export interface Quote extends Cart { discount: number; shipping: number; tax: number; total: number; delivery: string; }
export interface Address {id: number; recipient: string; street: string; city: string; region: string; postal_code: string;}
export interface OrderSummary {id:number|string; folio:string; status:string; total:number; created_at:string;}
export type PaymentMethod = 'card' | 'paypal';
export const paymentLabels: Record<PaymentMethod,string> = {card:'Tarjeta',paypal:'PayPal'};
export interface PurchasedProduct {
  order_id:number; folio:string; status:string; sku:string; name:string; platform:string; quantity:number; license:string|null;
}
export interface Order extends OrderSummary {
  user_id: number; subtotal:number; discount:number; shipping:number; tax:number; payment_status:string;
  payment_method?:PaymentMethod|null;
  reference:string; tracking:string|null; delivery_code:string|null; terms_version?:string|null; consent_at?:string|null;
  items:{ product_id:number; sku:string; name:string; description:string; unit_price:number; quantity:number; platform?:string }[];
  address:Address; history:{detail:string;created_at:string}[];
}
export interface SupportCase {
  id:number|string; folio:string; kind:string; status:string; order_id:number|string|null; reason:string;
  evidence:string; resolution:string|null; messages:{body:string;created_at:string}[];
}
export interface StoreComment {id:number|string; author:string; body:string; created_at:string;}
export interface Catalog {items:Product[]; total:number; page:number; pageSize:number;}
export interface Session {user:User|null; csrf:string; termsVersion:string;}
@Injectable({providedIn:'root'})
export class StoreApi {
  readonly preview = firebasePreview;
  private readonly spark = firebasePreview ? new SparkApi() : null;
  session: Session | null = null;
  async call<T>(path: string, method = 'GET', body?: object): Promise<T> {
    if (this.spark) return await this.spark.call(path, method, body) as T;
    const headers = new Headers({Accept:'application/json'});
    if (body) headers.set('Content-Type','application/json');
    if (method !== 'GET' && this.session) headers.set('X-CSRF-Token',this.session.csrf);
    const response=await fetch('/api'+path,{method,headers,credentials:'same-origin',body:body?JSON.stringify(body):undefined});
    const value=await response.json().catch(()=>({error:'El servidor devolvió una respuesta inválida.'}));
    if(!response.ok)throw new Error(value.error??'No se pudo completar la operación.');
    return value as T;
  }
  async openSession() { return this.session=await this.call<Session>('/auth/session'); }
  async authenticate(path:string, body:object) { return this.session=await this.call<Session>(path,'POST',body); }
}
export const mx = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',currencyDisplay:'code'});
export const labels: Record<string,string> = {
  pending:'Pendiente', paid:'Pagado', preparing:'En preparación', sent:'Enviado', delivered:'Entregado',
  cancelled:'Cancelado', refunded:'Reembolsado', approved:'Aprobado', declined:'Rechazado', open:'En revisión',
  needs_info:'En espera de información', denied:'No aprobado', cancel:'Cancelación', return:'Devolución',
  warranty:'Garantía', support:'Soporte', privacy:'Privacidad'
};
export function values(event:Event) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.target as HTMLFormElement)) as Record<string,string>;
}
