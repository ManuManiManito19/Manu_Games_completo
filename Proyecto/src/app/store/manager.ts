import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Category, Order, OrderSummary, Product, StoreApi, SupportCase, User, labels, mx, values } from './api';

type Tab='resumen'|'productos'|'categorias'|'inventario'|'pedidos'|'clientes'|'cupones'|'casos'|'bitacora';
interface Report {sales:{total:number;orders:number};lowStock:{sku:string;name:string;stock:number}[];
  top:{sku:string;name:string;quantity:number}[]; orders:{status:string;quantity:number}[]; cases:{kind:string;status:string;quantity:number}[];}
interface Coupon {code:string;percent:number;ends_at:string;max_uses:number;active:number;}
interface Movement {id:number;product_id:number;delta:number;reason:string;actor_id:number|null;order_id:number|null;created_at:string;}
interface Event {id:number;actor_id:number|null;action:string;entity:string;entity_id:string;detail:string|null;created_at:string;}
@Component({selector:'app-manager',templateUrl:'./manager.html'})
export class Manager implements OnInit {
  private readonly api=inject(StoreApi);
  private readonly cd=inject(ChangeDetectorRef);
  tab:Tab='resumen'; error=''; notice=''; busy=false;
  report?:Report; products:Product[]=[]; categories:Category[]=[]; orders:OrderSummary[]=[];
  cases:SupportCase[]=[]; customers:User[]=[]; coupons:Coupon[]=[]; moves:Movement[]=[]; logs:Event[]=[];
  editing?:Product; editingCategory?:Category; editingCoupon?:Coupon; order?:Order;
  readonly tabs:[Tab,string][]=[['resumen','Resumen y reportes'],['productos','Productos'],['categorias','Categorías'],['inventario','Inventario'],
    ['pedidos','Pedidos'],['clientes','Clientes'],['cupones','Promociones'],['casos','Solicitudes'],['bitacora','Auditoría']];
  readonly covers=Array.from({length:16},(_,i)=>i+1);
  estado(s:string){return labels[s]||s;}
  format(n:number){return mx.format(n/100);}
  ngOnInit(){void this.select('resumen');}
  async select(tab:Tab){
    if(this.busy)return;
    this.tab=tab;
    return this.run(()=>this.load());
  }
  next(s:string){return ({paid:'preparing',preparing:'sent',sent:'delivered'} as Record<string,string>)[s];}
  private async run(fn:()=>Promise<void>){
    if(this.busy)return;
    this.busy=true;this.error='';this.notice='';
    try{await fn();}catch(err){this.error=err instanceof Error?err.message:'Ocurrió un error.';}
    finally{this.busy=false;this.cd.markForCheck();}
  }
  private async load(){
    switch(this.tab){
      case 'resumen':this.report=await this.api.call<Report>('/admin/reports');return;
      case 'productos':
        [this.products,this.categories]=await Promise.all([this.api.call<Product[]>('/admin/products'),this.api.call<Category[]>('/admin/categories')]);return;
      case 'categorias':this.categories=await this.api.call<Category[]>('/admin/categories');return;
      case 'inventario':
        [this.moves,this.products]=await Promise.all([this.api.call<Movement[]>('/admin/inventory'),this.api.call<Product[]>('/admin/products')]);return;
      case 'pedidos':this.orders=await this.api.call<OrderSummary[]>('/admin/orders');return;
      case 'clientes':this.customers=await this.api.call<User[]>('/admin/customers');return;
      case 'cupones':this.coupons=await this.api.call<Coupon[]>('/admin/coupons');return;
      case 'casos':this.cases=await this.api.call<SupportCase[]>('/admin/returns');return;
      case 'bitacora':this.logs=await this.api.call<Event[]>('/admin/audit');return;
    }
  }
  saveProduct(event:globalThis.Event){
    const data=values(event); const id=this.editing?.id;
    return this.save('/admin/products'+(id?'/'+id:''),id?'PATCH':'POST',{
      ...data,category_id:Number(data['category_id']),price:Math.round(Number(data['price'])*100),active:data['active']==='on'
    },()=>{this.editing=undefined;(event.target as HTMLFormElement).reset();});
  }
  saveCategory(event:globalThis.Event){
    const data=values(event); const id=this.editingCategory?.id;
    return this.save('/admin/categories'+(id?'/'+id:''),id?'PATCH':'POST',{...data,active:data['active']==='on'},
      ()=>{this.editingCategory=undefined;(event.target as HTMLFormElement).reset();});
  }
  disable(type:'products'|'categories', id:number){return this.save('/admin/'+type+'/'+id,'DELETE');}
  adjust(event:globalThis.Event){
    const data=values(event);
    return this.save('/admin/inventory/'+Number(data['product']),'POST',{delta:Number(data['delta']),reason:data['reason']});
  }
  saveCoupon(event:globalThis.Event){
    const data=values(event);
    return this.save('/admin/coupons','POST',{...data,percent:Number(data['percent']),max_uses:Number(data['max_uses']),ends_at:data['ends_at']+'T23:59:59Z',active:data['active']==='on'},
      ()=>{this.editingCoupon=undefined;(event.target as HTMLFormElement).reset();});
  }
  viewOrder(id:number){return this.run(async()=>{this.order=await this.api.call<Order>('/orders/'+id);});}
  advance(id:number,status:string){
    return this.run(async()=>{
      this.order=await this.api.call<Order>('/admin/orders/'+id,'PATCH',{status});
      await this.load();this.notice='Estado actualizado.';
    });
  }
  resolve(event:globalThis.Event,id:number){
    return this.save('/admin/returns/'+id,'PATCH',values(event));
  }
  private save(path:string,method:string,body?:object,after?:()=>void){
    return this.run(async()=>{await this.api.call(path,method,body);await this.load();after?.();this.notice='Cambio guardado.';});
  }
}
