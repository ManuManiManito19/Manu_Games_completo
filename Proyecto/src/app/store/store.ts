import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { StoreApi, Address, Cart, Catalog, Category, Order, OrderSummary, Product, PurchasedProduct, Quote, SupportCase, User, labels, mx, values } from './api';
import { Manager } from './manager';
import { encodeAvatar, isUploadedAvatar } from './avatar';

@Component({
  selector:'app-store', imports:[Manager,NgTemplateOutlet], templateUrl:'./store.html', styleUrl:'./store.css'
})
export class Store implements OnInit {
  private readonly api=inject(StoreApi);
  readonly preview = this.api.preview;
  private readonly cd=inject(ChangeDetectorRef);
  view='inicio'; id=0; busy=false; error=''; notice=''; authMode='login';
  user:User|null=null;
  categories:Category[]=[]; catalog:Catalog={items:[],total:0,page:1,pageSize:6};
  filters:Record<string,string>={q:'',category:'',min:'',max:'',sort:'',stock:''};
  product?:Product;
  cart:Cart={items:[],subtotal:0};
  quote?:Quote;
  addresses:Address[]=[];
  orders:OrderSummary[]=[];
  purchasedProducts:PurchasedProduct[]=[];
  cases:SupportCase[]=[];
  order?:Order;
  payment?:Order;
  coupon='';
  addressId=0;
  selectedTermsVersion='';
  requestKey='';
  termsVersion='';
  labels=labels;
  readonly avatars=[
    {id:'memo', name:'Memo'},
    {id:'cyber', name:'Cyber'},
    {id:'gamer', name:'Gamer'},
    {id:'neon', name:'Neon'},
    {id:'hacker', name:'Hacker'},
  ];
  get cartCount(){return this.cart.items.reduce((n,item)=>n+item.quantity,0);}
  get filtered(){return Object.values(this.filters).some(Boolean);}
  get showPrevious(){return this.catalog.page>1;}
  get showNext(){return this.catalog.page*this.catalog.pageSize<this.catalog.total;}
  format(value:number){return mx.format(value/100);}
  avatarImage(id?:string){
    if (id && isUploadedAvatar(id)) return id;
    const avatar=this.avatars.find(option=>option.id===id) ?? this.avatars[0];
    return '/avatars/'+avatar.id+'.png';
  }
  portraitCover(image:string){
    return /\/(?:gamepass-|playstation-plus-|gow-ragnarok)/.test(image);
  }
  estado(value:string){return this.labels[value]||value;}
  caseStatus(ticket:SupportCase){
    if(ticket.kind==='return'&&ticket.status==='open')return 'Devolución en proceso';
    if(ticket.kind==='return'&&ticket.status==='approved')return 'Devolución completada';
    return this.estado(ticket.kind)+' · '+this.estado(ticket.status);
  }
  async ngOnInit(){
    await this.run(async()=>{
      const session=await this.api.openSession();
      this.user=session.user;
      this.termsVersion=session.termsVersion;
      [this.categories,this.cart]=await Promise.all([this.api.call<Category[]>('/categories'),this.api.call<Cart>('/cart')]);
      await this.loadView();
    });
  }
  @HostListener('window:hashchange')
  routeChanged() { void this.run(()=>this.loadView(true),true); }
  @HostListener('window:pageshow')
  async refreshCart() {
    if(this.api.session) {
      try { this.cart=await this.api.call<Cart>('/cart'); this.cd.markForCheck(); } catch {}
    }
  }
  private go(target:string) { location.hash=target; }
  private async run(work:()=>Promise<void>, navigation=false){
    if(this.busy&&!navigation)return;
    this.busy=true;
    this.error='';
    this.cd.markForCheck();
    try { await work(); }
    catch(err){this.error=err instanceof Error?err.message:'Error de operación.';}
    finally{this.busy=false;this.cd.markForCheck();}
  }
  private async loadView(focus=false){
    const [view,id]=location.hash.replace(/^#\/?/,'').split('/');
    this.notice='';
    const views = this.preview ? ['catalogo','producto','cuenta','ayuda'] :
      ['catalogo','producto','carrito','checkout','cuenta','pedido','ayuda','admin'];
    this.view=views.includes(view)?view:'inicio';
    this.id=Number(id||0);
    if(this.view==='inicio'||this.view==='catalogo') await this.loadPage(1);
    if(this.view==='producto') this.product=await this.api.call<Product>('/products/'+this.id);
    if(this.view==='carrito')this.cart=await this.api.call<Cart>('/cart');
    if(this.view==='checkout'&&this.user){
      this.addresses=await this.api.call<Address[]>('/addresses');
      this.addressId=this.addresses[0]?.id||0;
      this.payment=undefined;
      this.quote=undefined;
      if(this.cartCount) await this.refreshQuote();
    }
    if(this.view==='cuenta'&&this.user&&!this.preview) await this.accountData();
    if(this.view==='pedido'&&this.user) this.order=await this.api.call<Order>('/orders/'+this.id);
    if(this.view==='admin'&&this.user?.role==='admin') this.categories=await this.api.call<Category[]>('/categories');
    if(focus)setTimeout(()=>document.getElementById('page-title')?.focus({preventScroll:true}),0);
    window.scrollTo(0,0);
  }
  private async loadPage(page:number){
    const params=new URLSearchParams({ page:String(page) });
    if(this.view==='inicio'){
      params.set('sort','featured');
    } else {
      for(const [key,value] of Object.entries(this.filters)){
        if(value!=='')params.set(key,['min','max'].includes(key)?String(Math.round(Number(value)*100)):value);
      }
    }
    this.catalog=await this.api.call<Catalog>('/products?'+params);
  }
  search(event:Event){
    const data=values(event);
    this.filters={q:data['q']||'',category:data['category']||'',min:data['min']||'',max:data['max']||'',sort:data['sort']||'',stock:data['stock']||''};
    if(this.view==='catalogo'){void this.run(()=>this.loadPage(1));return;}
    this.go('catalogo');
  }
  filterCategory(id?:number){
    this.filters={...this.filters,category:id===undefined?'':String(id)};
    if(this.view==='catalogo')void this.run(()=>this.loadPage(1));
    else this.go('catalogo');
  }
  reset(){this.filters={q:'',category:'',min:'',max:'',sort:'',stock:''}; return this.run(()=>this.loadPage(1));}
  page(n:number){return this.run(()=>this.loadPage(n));}
  add(product:Product){
    return this.run(async()=>{
      this.cart=await this.api.call<Cart>('/cart','POST',{productId:product.id,quantity:1});
      this.notice=product.name+' se agregó al carrito.';
    });
  }
  quantity(id:number,event:Event){
    const data=values(event);
    return this.run(async()=>{this.cart=await this.api.call<Cart>('/cart/'+id,'PATCH',{quantity:Number(data['quantity'])});});
  }
  remove(id:number){return this.run(async()=>{this.cart=await this.api.call<Cart>('/cart/'+id,'DELETE');});}
  authenticate(event:Event){
    const data=values(event);
    return this.run(async()=>{
      if(this.authMode==='recovery'){
        const result=await this.api.call<{message:string}>('/auth/recovery','POST',{email:data['email']});
        this.notice=result.message;
        return;
      }
      if(this.authMode==='register'&&data['password']!==data['confirmPassword']){
        throw new Error('Las contraseñas no coinciden.');
      }
      delete data['confirmPassword'];
      if (this.authMode === 'register') await this.readAvatar(event, data);
      const s=await this.api.authenticate('/auth/'+(this.authMode==='register'?'register':'login'),{...data,accepted:data['accepted']==='on'});
      this.user=s.user;
      this.termsVersion=s.termsVersion;
      this.cart=await this.api.call<Cart>('/cart');
      if(this.view==='checkout')await this.loadView();
      else if(s.user?.role==='admin')this.go('admin');
      else this.go('inicio');
    });
  }
  logout(){return this.run(async()=>{
    await this.api.call('/auth/logout','POST',{});
    const s=await this.api.openSession();
    this.user=s.user;
    this.cart={items:[],subtotal:0};
    this.go('inicio');
  });}
  private async accountData(){
    [this.addresses,this.orders,this.cases,this.purchasedProducts]=await Promise.all([
      this.api.call<Address[]>('/addresses'),this.api.call<OrderSummary[]>('/orders'),this.api.call<SupportCase[]>('/returns'),
      this.api.call<PurchasedProduct[]>('/library')
    ]);
  }
  profile(event:Event){
    const data=values(event);
    const form = event.target as HTMLFormElement;
    return this.run(async()=>{
      await this.readAvatar(event, data);
      this.user=await this.api.call<User>('/profile','PATCH',data);
      const fileInput = form.querySelector<HTMLInputElement>('input[name="avatarFile"]');
      if (fileInput) fileInput.value = '';
      this.notice='Perfil guardado.';
    });
  }
  private async readAvatar(event: Event, data: Record<string, string>) {
    delete data['avatarFile'];
    const file = (event.target as HTMLFormElement)
      .querySelector<HTMLInputElement>('input[name="avatarFile"]')?.files?.[0];
    if (file) data['avatar'] = await encodeAvatar(file);
  }
  address(event:Event){
    const data=values(event);
    return this.run(async()=>{
      const added=await this.api.call<{id:number}>('/addresses','POST',data);
      this.addresses=await this.api.call<Address[]>('/addresses');
      this.addressId=added.id;
      this.notice='Dirección registrada.';
    });
  }
  removeAddress(id:number){
    return this.run(async()=>{
      await this.api.call('/addresses/'+id,'DELETE');
      this.addresses=await this.api.call<Address[]>('/addresses');
    });
  }
  async refreshQuote(){
    this.quote=undefined;
    this.quote=await this.api.call<Quote>('/quote','POST',{coupon:this.coupon});
    this.selectedTermsVersion=this.termsVersion;
    this.requestKey=crypto.randomUUID();
  }
  updateCoupon(event:Event){
    this.coupon=values(event)['coupon']||'';
    return this.run(()=>this.refreshQuote());
  }
  place(event:Event){
    const data=values(event);
    return this.run(async()=>{
      if(!this.quote)return;
      // El identificador de la cotización se mantiene durante los reintentos.
      this.payment=await this.api.call<Order>('/orders','POST',{
        addressId:Number(data['addressId']),method:'digital',coupon:this.coupon,
        quotedTotal:this.quote.total,accepted:data['accepted']==='on',termsVersion:this.selectedTermsVersion,requestKey:this.requestKey
      });
    });
  }
  pay(id:number,outcome:'approve'|'decline'){
    return this.run(async()=>{
      await this.api.call<Order>('/payments/'+id+'/confirm','POST',{outcome});
      this.cart=await this.api.call<Cart>('/cart');
      if(this.view==='pedido')this.order=await this.api.call<Order>('/orders/'+id);
      else this.go('pedido/'+id);
    });
  }
  submitCase(event:Event, orderId?:number){
    const data=values(event);
    return this.run(async()=>{
      const item=Number(data['productId']||0);
      const ticket=await this.api.call<{folio:string}>('/returns','POST',{...data,orderId,productId:item||undefined});
      this.notice='Solicitud registrada con el folio '+ticket.folio+'.';
      if(this.view==='cuenta')await this.accountData();
    });
  }
  reply(event:Event,id:number){
    const data=values(event);
    return this.run(async()=>{await this.api.call('/returns/'+id+'/messages','POST',data);await this.accountData();});
  }
}
