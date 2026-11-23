import type { Cart, Catalog, Category, Order, PaymentMethod, Product, Quote, Session, User } from './api';
import { isUploadedAvatar } from './avatar';

type Field = { stringValue: string } | { integerValue: string } | { timestampValue: string }
  | { nullValue: null } | { arrayValue: { values?: Field[] } } | { mapValue: { fields: Record<string,Field> } };
type Document = { name: string; fields: Record<string, Field> };
type CartLine = { productId: number; quantity: number };
type OrderInput = { quotedTotal: number; coupon: string; requestKey: string; paymentMethod: PaymentMethod };
type CaseInput = { kind: string; reason: string; orderId?: string; productId?: number };
type CommentInput = { body: string; publish: boolean };
type Tokens = { localId: string; idToken: string; refreshToken: string; expiresIn: string; email: string };
type StoredTokens = Tokens & { expiresAt: number };
type Refresh = { id_token: string; refresh_token: string; expires_in: string };
type Profile = { name: string; avatar: string };
type Credentials = { name?: string; email: string; password: string; accepted?: boolean; avatar?: string };

const sessionKey = 'manu-games-auth';
const cartKey = 'manu-games-cart';
const maxProducts = 6;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const categories: Category[] = ['Juegos', 'DLCs', 'Complementos'].map((name, index) => ({
  id: index + 1, name, active: 1,
}));
const anonymous = (): Session => ({ user: null, termsVersion: '2026-11-19', csrf: '' });
const searchKey = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const authErrors: Record<string, string> = {
  INVALID_LOGIN_CREDENTIALS: 'El correo o la contraseña son incorrectos.',
  INVALID_PASSWORD: 'El correo o la contraseña son incorrectos.',
  EMAIL_EXISTS: 'Ya existe una cuenta con ese correo.',
  INVALID_EMAIL: 'Escribe un correo válido.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Intenta de nuevo más tarde.',
};

class FirebaseRequestError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(authErrors[code] ?? 'Firebase no pudo completar la operación. Intenta de nuevo.');
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const value = await response.json();
  if (!response.ok) throw new FirebaseRequestError(response.status, value.error?.message ?? '');
  return value as T;
}

function fieldValue(field: Field): unknown {
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('timestampValue' in field) return field.timestampValue;
  if ('arrayValue' in field) return (field.arrayValue.values ?? []).map(fieldValue);
  if ('mapValue' in field) return decodeFields(field.mapValue.fields);
  return null;
}
function decodeFields(fields: Record<string,Field>): Record<string,unknown> {
  return Object.fromEntries(Object.entries(fields).map(([name, value])=>[name, fieldValue(value)]));
}
function encodeField(value: unknown): Field {
  if (typeof value === 'string') return { stringValue:value };
  if (typeof value === 'number' && Number.isSafeInteger(value)) return { integerValue:String(value) };
  if (Array.isArray(value)) return { arrayValue:{ values:value.map(encodeField) } };
  if (value === null) return { nullValue:null };
  if (typeof value === 'object') return { mapValue:{ fields:encodeFields(value) } };
  throw new Error('Hay un valor inválido en la solicitud.');
}
function encodeFields(input: object): Record<string,Field> {
  return Object.fromEntries(Object.entries(input).map(([name,value])=>[name,encodeField(value)]));
}
function docValue(document: Document): Record<string,unknown> & {id:string} {
  return { ...decodeFields(document.fields), id: document.name.split('/').pop()! };
}

export class SparkApi {
  private configuration?: Promise<{ apiKey: string; projectId: string }>;
  private catalogRequest?: Promise<Product[]>;
  private tokens?: StoredTokens;

  private config() {
    this.configuration ??= request<{ apiKey: string; projectId: string }>('/__/firebase/init.json')
      .catch(error => { this.configuration = undefined; throw error; });
    return this.configuration;
  }

  private async auth<T>(action: string, body: object) {
    const { apiKey } = await this.config();
    return request<T>('https://identitytoolkit.googleapis.com/v1/accounts:' + action + '?key=' + apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  }

  private saveTokens(tokens: Tokens) {
    this.tokens = { ...tokens, expiresAt: Date.now() + Number(tokens.expiresIn) * 1000 };
    sessionStorage.setItem(sessionKey, JSON.stringify(this.tokens));
  }

  private async activeTokens() {
    if (!this.tokens) {
      const stored = sessionStorage.getItem(sessionKey);
      if (!stored) return null;
      try { this.tokens = JSON.parse(stored) as StoredTokens; }
      catch { this.logout(); return null; }
    }
    const tokens = this.tokens;
    if (tokens.expiresAt > Date.now() + 60000) return tokens;
    const { apiKey } = await this.config();
    try {
      const refreshed = await request<Refresh>('https://securetoken.googleapis.com/v1/token?key=' + apiKey, {
        method: 'POST',
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken }),
      });
      this.saveTokens({ ...tokens, idToken: refreshed.id_token, refreshToken: refreshed.refresh_token,
        expiresIn: refreshed.expires_in });
      return this.tokens;
    } catch (error) {
      if (error instanceof FirebaseRequestError && [400, 401].includes(error.status)) {
        this.logout();
        return null;
      }
      throw error;
    }
  }

  private async firestore<T>(path: string, options?: RequestInit) {
    const { projectId } = await this.config();
    return request<T>('https://firestore.googleapis.com/v1/projects/' + projectId +
      '/databases/(default)/documents' + path, options);
  }

  private authHeaders(tokens: Tokens) {
    return { Authorization:'Bearer '+tokens.idToken, 'Content-Type':'application/json' };
  }

  private async requireLogin() {
    const tokens=await this.activeTokens();
    if(!tokens)throw new Error('Inicia sesión para continuar.');
    return tokens;
  }

  private async recent(path: string, tokens?: Tokens) {
    const page=await this.firestore<{documents?:Document[]}>('/'+path+'?orderBy=created_at%20desc&pageSize=50',
      tokens?{headers:this.authHeaders(tokens)}:undefined);
    return (page.documents??[]).map(docValue);
  }

  private async create(path: string, fields: object, tokens: Tokens) {
    const config=await this.config();
    const name='projects/'+config.projectId+'/databases/(default)/documents/'+path;
    await this.firestore(':commit',{
      method:'POST',headers:this.authHeaders(tokens),body:JSON.stringify({writes:[{
        update:{name,fields:encodeFields(fields)},
        updateTransforms:[{fieldPath:'created_at',setToServerValue:'REQUEST_TIME'}],
        currentDocument:{exists:false},
      }]})
    });
  }

  private async products(): Promise<Product[]> {
    this.catalogRequest ??= (async () => {
      const products: Product[] = [];
      let nextPageToken: string | undefined;
      do {
        const query = new URLSearchParams({ pageSize: '100' });
        if (nextPageToken) query.set('pageToken', nextPageToken);
        const page = await this.firestore<{ documents?: Document[]; nextPageToken?: string }>('/manuGamesCatalog?' + query);
        for (const document of page.documents ?? []) {
          const product = Object.fromEntries(Object.entries(document.fields).map(([key, field]) => [key, fieldValue(field)])) as unknown as Product;
          if (product.active === 1 && categories.some(category => category.id === product.category_id)) products.push(product);
        }
        nextPageToken = page.nextPageToken;
      } while (nextPageToken);
      return products;
    })().catch(error => { this.catalogRequest = undefined; throw error; });
    return this.catalogRequest;
  }

  private async catalog(query: URLSearchParams): Promise<Catalog> {
    const name = searchKey((query.get('q') ?? '').trim());
    const category = Number(query.get('category') ?? 0);
    const min = Number(query.get('min') ?? 0);
    const max = Number(query.get('max') ?? Infinity);
    const page = Math.max(1, Number(query.get('page')) || 1);
    const pageSize = 6;
    const products = (await this.products()).filter(product =>
      (!name || searchKey(product.name).startsWith(name) || searchKey(product.sku).startsWith(name)) &&
      (!category || product.category_id === category) && product.price >= min && product.price <= max &&
      (query.get('stock') !== '1' || product.stock > 0)
    );
    const sort = query.get('sort');
    products.sort((a, b) => {
      switch (sort) {
        case 'name': return a.name.localeCompare(b.name, 'es') || a.id - b.id;
        case 'ascending': return a.price - b.price || a.id - b.id;
        case 'descending': return b.price - a.price || a.id - b.id;
        case 'newest': return b.id - a.id;
        case 'featured':
          return Number(b.image.startsWith('/games/')) - Number(a.image.startsWith('/games/')) || b.id - a.id;
        default: return a.id - b.id;
      }
    });
    return { items: products.slice((page - 1) * pageSize, page * pageSize), total: products.length, page, pageSize };
  }

  private profileOf(tokens: Tokens, profile: Profile): User {
    return { id: tokens.localId, name: profile.name, email: tokens.email, avatar: profile.avatar, role: 'client' };
  }

  private async profile(tokens: Tokens): Promise<User> {
    try {
      const record = await this.firestore<Document>('/manuGamesProfiles/' + tokens.localId, {
        headers: { Authorization: 'Bearer ' + tokens.idToken },
      });
      return this.profileOf(tokens, {
        name: String(fieldValue(record.fields['name'])), avatar: String(fieldValue(record.fields['avatar'])),
      });
    } catch (error) {
      if (error instanceof FirebaseRequestError && error.status === 404) {
        return this.profileOf(tokens, { name: tokens.email.split('@')[0], avatar: 'memo' });
      }
      throw error;
    }
  }

  private async saveProfile(tokens: Tokens, input: Partial<Profile>) {
    const name = input.name?.trim() ?? '';
    if (name.length < 2 || name.length > 90) throw new Error('Escribe un nombre de 2 a 90 caracteres.');
    const avatar = input.avatar ?? 'memo';
    if (!['memo', 'cyber', 'gamer', 'neon', 'hacker'].includes(avatar) && !isUploadedAvatar(avatar)) {
      throw new Error('Selecciona un avatar o una imagen válida.');
    }
    await this.firestore('/manuGamesProfiles/' + tokens.localId, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + tokens.idToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { name: { stringValue: name }, avatar: { stringValue: avatar } } }),
    });
    return this.profileOf(tokens, { name, avatar });
  }

  private logout() {
    this.tokens = undefined;
    sessionStorage.removeItem(sessionKey);
  }

  private async session(): Promise<Session> {
    const tokens = await this.activeTokens();
    if (!tokens) return anonymous();
    return { ...anonymous(), user: await this.profile(tokens) };
  }

  private cartLines(): CartLine[] {
    try {
      const lines:unknown=JSON.parse(sessionStorage.getItem(cartKey)??'[]');
      if(Array.isArray(lines))return lines.filter(line=>Number.isInteger(line?.productId)
        && Number.isInteger(line.quantity)&&line.quantity>0&&line.quantity<=99).slice(0,maxProducts);
    } catch {}
    return [];
  }

  private async cart(lines=this.cartLines()): Promise<Cart> {
    if(!lines.length)return {items:[],subtotal:0};
    const products=await this.products();
    const items=lines.flatMap(line=>{
      const product=products.find(item=>item.id===line.productId);
      return product?[{...product,quantity:line.quantity}]:[];
    });
    return {items,subtotal:items.reduce((total,item)=>total+item.price*item.quantity,0)};
  }

  private async setCart(productId:number,quantity:number,add=false) {
    const lines=this.cartLines();
    const existing=lines.find(line=>line.productId===productId);
    const units=quantity+(add?(existing?.quantity??0):0);
    if(!Number.isInteger(units)||units<0||units>99)throw new Error('Selecciona de 1 a 99 unidades.');
    const next=lines.filter(line=>line.productId!==productId);
    if(units){
      const product=(await this.products()).find(item=>item.id===productId);
      if(!product||product.stock<units)throw new Error('Inventario insuficiente.');
      if(next.length>=maxProducts)throw new Error('Agrega hasta seis productos distintos por pedido de prueba.');
      next.push({productId,quantity:units});
    }
    sessionStorage.setItem(cartKey,JSON.stringify(next));
    return this.cart(next);
  }

  private async quote(coupon: string): Promise<Quote> {
    this.catalogRequest=undefined;
    const cart=await this.cart();
    if(!cart.items.length)throw new Error('El carrito está vacío.');
    if(cart.items.some(item=>item.stock<item.quantity))throw new Error('Hay productos que ya no tienen suficiente stock.');
    const code=(coupon??'').trim().toUpperCase();
    if(code&&code!=='DEMO10')throw new Error('Cupón inválido.');
    const discount=code?Math.floor(cart.subtotal/10):0;
    return {...cart,discount,shipping:0,tax:0,total:cart.subtotal-discount,delivery:'Pedido digital de prueba'};
  }

  private orderPath(tokens:Tokens,id:string) {
    if(!uuid.test(id))throw new Error('Pedido no encontrado.');
    return 'manuGamesAccounts/'+tokens.localId+'/orders/'+id;
  }

  private async order(tokens: Tokens,id:string): Promise<Order> {
    const record=docValue(await this.firestore<Document>('/'+this.orderPath(tokens,id),{headers:this.authHeaders(tokens)}));
    return { ...record, payment_status:record['status']==='refunded'?'refunded':'approved',
      reference:'SIM-'+id.slice(0,12).toUpperCase(),
      shipping:0,tax:0,history:[{detail:'Compra de prueba confirmada',created_at:record['created_at']}] } as unknown as Order;
  }

  private async place(input: OrderInput) {
    const tokens=await this.requireLogin();
    const path=this.orderPath(tokens,input.requestKey);
    if(input.paymentMethod!=='card'&&input.paymentMethod!=='paypal')throw new Error('Selecciona Tarjeta o PayPal.');
    try { return await this.order(tokens,input.requestKey); }
    catch(error){if(!(error instanceof FirebaseRequestError&&error.status===404))throw error;}
    const totals=await this.quote(input.coupon);
    if(totals.total!==input.quotedTotal)throw new Error('El total cambió. Aplica el cupón nuevamente y revisa la compra.');
    const items=totals.items.map(item=>({product_id:item.id,sku:item.sku,name:item.name,
      platform:item.platform,unit_price:item.price,quantity:item.quantity}));
    await this.create(path,{
      folio:'MG-'+input.requestKey.toUpperCase(),status:'paid',items,skus:items.map(item=>item.sku),
      payment_method:input.paymentMethod,subtotal:totals.subtotal,discount:totals.discount,total:totals.total,
    },tokens);
    sessionStorage.removeItem(cartKey);
    return this.order(tokens,input.requestKey);
  }

  private async submitCase(input: CaseInput) {
    const tokens=await this.requireLogin();
    const reason=input.reason?.trim()??'';
    if(reason.length<5||reason.length>450)throw new Error('Escribe un motivo de 5 a 450 caracteres.');
    const privacy=input.kind==='privacy';
    if(!privacy&&!['cancel','return','warranty'].includes(input.kind))throw new Error('Selecciona un tipo de solicitud válido.');
    const orderId=privacy?null:input.orderId??'';
    const productId=privacy?null:input.productId??null;
    const id=crypto.randomUUID();
    if(orderId){
      const order=await this.order(tokens,orderId);
      if(order.status!=='paid')throw new Error('El pedido ya está cerrado.');
      if(productId&&!order.items.some(item=>item.product_id===productId))throw new Error('La partida no pertenece al pedido.');
    }
    const casePath='manuGamesAccounts/'+tokens.localId+'/cases/'+(orderId??id);
    const ticket={folio:'AT-'+id.slice(0,13).toUpperCase(),kind:input.kind,status:'open',reason,evidence:'',
      order_id:orderId,product_id:productId,resolution:null};
    try { await this.create(casePath,ticket,tokens); }
    catch(error){
      if(orderId&&error instanceof FirebaseRequestError&&[403,409].includes(error.status)){
        const prior=await this.firestore<Document>('/'+casePath,{headers:this.authHeaders(tokens)})
          .catch(()=>undefined);
        if(prior)throw new Error('Este pedido ya tiene una solicitud registrada. Consulta su folio en Devoluciones.');
      }
      throw error;
    }
    return ticket;
  }

  private async submitComment(input: CommentInput) {
    const tokens=await this.requireLogin();
    if(input.publish!==true)throw new Error('Confirma que tu comentario será público.');
    const body=input.body?.trim()??'';
    if(body.length<5||body.length>450)throw new Error('Escribe de 5 a 450 caracteres.');
    const profile=await this.profile(tokens);
    const author=profile.name;
    await this.create('manuGamesComments/'+crypto.randomUUID(),{author,body},tokens);
    return {ok:true};
  }

  async call(path: string, method: string, body?: object): Promise<unknown> {
    const [route, query] = path.split('?');
    const productId = /^\/products\/(\d+)$/.exec(route)?.[1];
    const orderId = /^\/orders\/([0-9a-f-]+)$/.exec(route)?.[1];
    const cartProduct = /^\/cart\/(\d+)$/.exec(route)?.[1];
    const cartInput=body as CartLine;
    if(method==='GET'&&orderId)return this.order(await this.requireLogin(),orderId);
    if(cartProduct&&method==='PATCH')return this.setCart(Number(cartProduct),cartInput.quantity);
    if(cartProduct&&method==='DELETE')return this.setCart(Number(cartProduct),0);
    if (method === 'GET' && productId) {
      const products = await this.products();
      const product = products.find(item => item.id === Number(productId));
      if (!product) throw new Error('Producto no encontrado.');
      return { ...product, variants: products.filter(item => item.family === product.family) };
    }
    const input = body as Credentials;
    switch (method + ' ' + route) {
      case 'GET /products': return this.catalog(new URLSearchParams(query));
      case 'GET /categories': return categories;
      case 'GET /cart': return this.cart();
      case 'POST /cart': return this.setCart(cartInput.productId,cartInput.quantity,true);
      case 'POST /quote': return this.quote((body as OrderInput).coupon);
      case 'POST /orders': return this.place(body as OrderInput);
      case 'GET /orders': {
        const tokens=await this.requireLogin();
        return this.recent('manuGamesAccounts/'+tokens.localId+'/orders',tokens);
      }
      case 'GET /returns': {
        const tokens=await this.requireLogin();
        return (await this.recent('manuGamesAccounts/'+tokens.localId+'/cases',tokens))
          .map(value=>({messages:[],...value}));
      }
      case 'POST /returns': return this.submitCase(body as CaseInput);
      case 'GET /comments': return this.recent('manuGamesComments');
      case 'POST /comments': return this.submitComment(body as CommentInput);
      case 'GET /auth/session': return this.session();
      case 'POST /auth/login': {
        const tokens = await this.auth<Tokens>('signInWithPassword', {
          email: input.email, password: input.password, returnSecureToken: true,
        });
        this.saveTokens(tokens);
        return this.session();
      }
      case 'POST /auth/register': {
        if (!input.accepted) throw new Error('Acepta los términos y consulta el aviso de privacidad.');
        const name = input.name?.trim() ?? '';
        if (name.length < 2 || name.length > 90) throw new Error('Escribe un nombre de 2 a 90 caracteres.');
        if (input.password.length < 12) throw new Error('Usa al menos 12 caracteres en la contraseña.');
        const tokens = await this.auth<Tokens>('signUp', {
          email: input.email, password: input.password, returnSecureToken: true,
        });
        this.saveTokens(tokens);
        const user = await this.saveProfile(tokens, input);
        return { ...anonymous(), user };
      }
      case 'POST /auth/logout': this.logout(); return anonymous();
      case 'POST /auth/recovery':
        try { await this.auth('sendOobCode', { requestType: 'PASSWORD_RESET', email: input.email }); }
        catch (error) {
          if (!(error instanceof FirebaseRequestError) || error.code !== 'EMAIL_NOT_FOUND') throw error;
        }
        return { message: 'Si la cuenta existe, recibirás instrucciones por correo.' };
      case 'PATCH /profile': {
        const tokens = await this.activeTokens();
        if (!tokens) throw new Error('Vuelve a iniciar sesión para guardar el perfil.');
        const current = await this.profile(tokens);
        return this.saveProfile(tokens, { name: input.name, avatar: input.avatar ?? current.avatar });
      }
      default: throw new Error('Esta operación requiere el servidor de la tienda.');
    }
  }
}
