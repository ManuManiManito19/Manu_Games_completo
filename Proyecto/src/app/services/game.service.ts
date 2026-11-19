import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface Juego {
  id: number;
  titulo: string;
  precio: number;
  categoria: string;
  descripcion: string;
  imagen?: string;
  arte?: { titulo: string; detalle: string };
  stock: number;
  plataforma: string;
}

const CATEGORIAS_COMPLEMENTOS = ['Suscripciones', 'DLC', 'Monedas virtuales'];

export interface ItemCarrito {
  juego: Juego;
  cantidad: number;
}

export interface ProductoComprado {
  idCompra: string;
  juegoId: number;
  titulo: string;
  claveLicencia: string;
  fechaCompra: string;
  precio: number;
  metodoPago: string;
  finDevolucion?: number;
  estado: 'ACTIVO' | 'DEVOLUCION_SOLICITADA' | 'REEMBOLSADO';
}

export interface SolicitudDevolucion {
  claveLicencia: string;
  motivo: string;
  metodoReembolso: string;
  detallesAdicionales: string;
  fechaSolicitud: string;
}

interface CompraLocal extends ProductoComprado {
  correo: string;
  devolucion?: SolicitudDevolucion;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly authService = inject(AuthService);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly claveCompras = 'manu_games_pedidos_demo';
  private juegos: Juego[] = [
    {
      id: 1,
      titulo: 'Grand Theft Auto VI',
      precio: 1800.00,
      categoria: 'Mundo Abierto',
      descripcion: 'Bienvenido de vuelta a Vice City. Licencia de acceso anticipado con recompensas digitales exclusivas.',
      imagen: '/games/gta6.jpg',
      stock: 15,
      plataforma: 'PC / Console'
    },
    {
      id: 2,
      titulo: 'Cyberpunk 2077: Phantom Liberty',
      precio: 999.00,
      categoria: 'DLC',
      descripcion: 'Expansión de suspenso y espionaje ambientada en Dogtown. Requiere el juego base Cyberpunk 2077.',
      imagen: '/games/cp2077.jpg',
      stock: 25,
      plataforma: 'PC'
    },
    {
      id: 3,
      titulo: 'Call of Duty: Black Ops 6',
      precio: 1399.00,
      categoria: 'Acción / Shooter',
      descripcion: 'Operaciones encubiertas en la era de los 90. Campaña intensa y multijugador competitivo.',
      imagen: '/games/blackops6.jpg',
      stock: 20,
      plataforma: 'PC / Xbox / PlayStation'
    },
    {
      id: 4,
      titulo: 'Elden Ring: Shadow of the Erdtree',
      precio: 899.00,
      categoria: 'DLC',
      descripcion: 'Expansión para explorar la Tierra de las Sombras. Requiere el juego base Elden Ring.',
      imagen: '/games/elden_ring.jpg',
      stock: 10,
      plataforma: 'PC'
    },
    {
      id: 5,
      titulo: 'EA Sports FC 25',
      precio: 1299.00,
      categoria: 'Deportes / Simulación',
      descripcion: 'Vive la experiencia futbolística definitiva con tecnología HypermotionV y licencias oficiales.',
      imagen: '/games/fifa25.jpg',
      stock: 30,
      plataforma: 'PC / Console'
    },
    {
      id: 6,
      titulo: 'Red Dead Redemption 2',
      precio: 799.00,
      categoria: 'Mundo Abierto / Acción',
      descripcion: 'Una epopeya sobre la vida en el corazón del territorio americano al comienzo del siglo XX.',
      imagen: '/games/reddead2.jpg',
      stock: 18,
      plataforma: 'PC'
    },
    {
      id: 7,
      titulo: 'Halo Infinite',
      precio: 699.00,
      categoria: 'Shooter / Ciencia Ficción',
      descripcion: 'El Master Chief regresa en la aventura más amplia de Halo para salvar a la humanidad.',
      imagen: '/games/haloinfinite.jpg',
      stock: 22,
      plataforma: 'PC / Xbox'
    },
    {
      id: 8,
      titulo: 'God of War Ragnarök',
      precio: 1199.00,
      categoria: 'Acción / Aventura',
      descripcion: 'Kratos y Atreus deben viajar a cada uno de los Nueve Reinos en busca de respuestas.',
      imagen: '/games/gowr.jpg',
      stock: 12,
      plataforma: 'PC / PlayStation'
    },
    {
      id: 9,
      titulo: "Elden Ring",
      precio: 899,
      categoria: "Soulslike / RPG",
      descripcion: "Juego base de mundo abierto. Recorre las Tierras Intermedias y crea tu propio Sinluz.",
      imagen: '/games/elden_ring.jpg',
      stock: 10,
      plataforma: 'PC'
    },
    {
      id: 10,
      titulo: "Cyberpunk 2077",
      precio: 999,
      categoria: "RPG / Acción",
      descripcion: "Juego base de rol y acción. Explora Night City como V.",
      imagen: '/games/cp2077.jpg',
      stock: 25,
      plataforma: 'PC'
    },
    {
      id: 11,
      titulo: "PlayStation Plus Essential — 1 mes",
      precio: 149,
      categoria: "Suscripciones",
      descripcion: "Un mes de acceso a multijugador en línea, juegos mensuales y descuentos del plan Essential.",
      stock: 20,
      plataforma: 'PS4 / PS5',
      arte: { titulo: 'PS PLUS', detalle: '1 MES' }
    },
    {
      id: 12,
      titulo: "PlayStation Plus Essential — 3 meses",
      precio: 399,
      categoria: "Suscripciones",
      descripcion: "Tres meses de acceso a los beneficios del plan Essential en PlayStation.",
      stock: 20,
      plataforma: 'PS4 / PS5',
      arte: { titulo: 'PS PLUS', detalle: '3 MESES' }
    },
    {
      id: 13,
      titulo: "Xbox Game Pass Ultimate — 1 mes",
      precio: 339,
      categoria: "Suscripciones",
      descripcion: "Un mes del plan Ultimate para explorar el catálogo de Game Pass en dispositivos compatibles.",
      stock: 20,
      plataforma: 'Xbox / PC',
      arte: { titulo: 'GAME PASS', detalle: '1 MES' }
    },
    {
      id: 14,
      titulo: "Xbox Game Pass Ultimate — 3 meses",
      precio: 999,
      categoria: "Suscripciones",
      descripcion: "Tres meses del plan Ultimate para explorar el catálogo de Game Pass en dispositivos compatibles.",
      stock: 20,
      plataforma: 'Xbox / PC',
      arte: { titulo: 'GAME PASS', detalle: '3 MESES' }
    },
    {
      id: 15,
      titulo: "Call of Duty: Black Ops 6 — 1,100 puntos COD",
      precio: 199,
      categoria: "Monedas virtuales",
      descripcion: "Puntos COD para contenido compatible dentro del juego. Canje de demostración para Xbox.",
      stock: 30,
      plataforma: 'Xbox',
      arte: { titulo: 'COD POINTS', detalle: '1,100' }
    },
    {
      id: 16,
      titulo: "Gears 5 — 500 Iron",
      precio: 99,
      categoria: "Monedas virtuales",
      descripcion: "Moneda virtual de Gears 5 para adquirir contenido compatible en la tienda del juego.",
      stock: 30,
      plataforma: 'Xbox',
      arte: { titulo: 'GEARS 5', detalle: '500 IRON' }
    },
    {
      id: 17,
      titulo: "EA Sports FC 25 — 1,050 FC Points",
      precio: 199,
      categoria: "Monedas virtuales",
      descripcion: "Puntos para contenido de Ultimate Team en EA Sports FC 25.",
      stock: 25,
      plataforma: 'Xbox',
      arte: { titulo: 'FC POINTS', detalle: '1,050' }
    },
    {
      id: 18,
      titulo: "Halo Infinite — 1,000 créditos",
      precio: 199,
      categoria: "Monedas virtuales",
      descripcion: "Créditos para personalización y contenido compatible en el multijugador de Halo Infinite.",
      stock: 25,
      plataforma: 'Xbox',
      arte: { titulo: 'HALO', detalle: '1,000 CRÉDITOS' }
    },
    {
      id: 19,
      titulo: "Red Dead Online — 25 lingotes de oro",
      precio: 199,
      categoria: "Monedas virtuales",
      descripcion: "Moneda virtual de Red Dead Online para adquirir artículos y contenido dentro del juego. Requiere acceso a Red Dead Online.",
      stock: 25,
      plataforma: 'Xbox One',
      arte: { titulo: 'RED DEAD ONLINE', detalle: '25 LINGOTES' }
    },
    {
      id: 20,
      titulo: "Gears 5: Hivebusters",
      precio: 349,
      categoria: "DLC",
      descripcion: "Expansión de campaña protagonizada por el escuadrón Scorpio. Requiere Gears 5.",
      stock: 15,
      plataforma: 'Xbox',
      arte: { titulo: 'GEARS 5', detalle: 'HIVEBUSTERS' }
    }
  ];

  private carrito: ItemCarrito[] = [];

  constructor() {
    for (const compra of this.leerCompras()) {
      const producto = this.getJuegoPorId(compra.juegoId);
      if (producto && compra.estado === 'ACTIVO') producto.stock = Math.max(0, producto.stock - 1);
    }
  }

  private juegoSeleccionado: Juego | null = null;

  // --- MÉTODOS DE CATÁLOGO Y BÚSQUEDA ---
  getJuegos(): Juego[] {
    return this.juegos;
  }

  getJuegoPorId(id: number): Juego | undefined {
    return this.juegos.find(j => j.id === id);
  }

  getCategoriasJuegos(): string[] {
    const generos = this.juegos
      .filter(juego => !CATEGORIAS_COMPLEMENTOS.includes(juego.categoria))
      .map(juego => juego.categoria);

    return [...new Set(generos)].sort((a, b) => a.localeCompare(b, 'es'));
  }

  getCategoriasComplementos(): readonly string[] {
    return CATEGORIAS_COMPLEMENTOS;
  }

  buscarJuegos(query: string, categoria = ''): Juego[] {
    const q = this.normalizarBusqueda(query);
    return this.juegos.filter(juego => {
      const esComplemento = CATEGORIAS_COMPLEMENTOS.includes(juego.categoria);
      const coincideCategoria = !categoria ||
        (categoria === 'juegos' && !esComplemento) ||
        (categoria === 'complementos' && esComplemento) ||
        juego.categoria === categoria;
      return coincideCategoria && this.normalizarBusqueda(juego.titulo).startsWith(q);
    });
  }

  private normalizarBusqueda(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  setJuegoSeleccionado(juego: Juego | null): void {
    this.juegoSeleccionado = juego;
  }

  getJuegoSeleccionado(): Juego | null {
    return this.juegoSeleccionado;
  }

  // --- MÉTODOS DEL CARRITO ---
  agregarAlCarrito(juego: Juego): void {
    const itemExistente = this.carrito.find(item => item.juego.id === juego.id);
    if (itemExistente) {
      if (itemExistente.cantidad < juego.stock) {
        itemExistente.cantidad++;
      }
    } else {
      if (juego.stock > 0) {
        this.carrito.push({ juego, cantidad: 1 });
      }
    }
  }

  obtenerCarrito(): ItemCarrito[] {
    return this.carrito;
  }

  eliminarDelCarrito(juegoId: number): void {
    this.carrito = this.carrito.filter(item => item.juego.id !== juegoId);
  }

  vaciarCarrito(): void {
    this.carrito = [];
  }

  obtenerTotalCarrito(): number {
    return this.carrito.reduce((total, item) => total + (item.juego.precio * item.cantidad), 0);
  }

  getMisCompras(): ProductoComprado[] {
    const correo = this.authService.getPerfilUsuario()?.email;
    const ahora = Date.now();
    return this.leerCompras().filter(compra => compra.correo === correo).map(compra => {
      if (compra.estado !== 'DEVOLUCION_SOLICITADA' || !compra.devolucion) return compra;
      const finDevolucion = Date.parse(compra.devolucion.fechaSolicitud) + 60_000;
      if (!Number.isFinite(finDevolucion)) return compra;
      return { ...compra, finDevolucion, estado: ahora >= finDevolucion ? 'REEMBOLSADO' : compra.estado };
    });
  }

  realizarCompraDirecta(juego: Juego, metodoPago: string): ProductoComprado | null {
    const correo = this.authService.getPerfilUsuario()?.email;
    const producto = this.getJuegoPorId(juego.id);
    if (!correo || !producto || producto.stock <= 0 || producto.precio <= 0) return null;

    const folio = crypto.randomUUID().toUpperCase();
    const compra: CompraLocal = {
      correo,
      idCompra: `ORD-${folio.slice(0, 8)}`,
      juegoId: producto.id,
      titulo: producto.titulo,
      claveLicencia: folio,
      fechaCompra: new Date().toISOString().split('T')[0],
      precio: producto.precio,
      metodoPago,
      estado: 'ACTIVO'
    };

    if (!this.guardarCompras([...this.leerCompras(), compra])) return null;

    producto.stock--;
    return compra;
  }

  validarClaveLicencia(clave: string): ProductoComprado | undefined {
    const claveNormalizada = clave.trim().toUpperCase();
    return this.getMisCompras().find(compra =>
      compra.claveLicencia === claveNormalizada && compra.estado === 'ACTIVO'
    );
  }

  procesarDevolucion(solicitud: SolicitudDevolucion): boolean {
    const pedido = this.validarClaveLicencia(solicitud.claveLicencia);
    if (!pedido) return false;

    const compras = this.leerCompras().map(compra =>
      compra.claveLicencia === pedido.claveLicencia
        ? { ...compra, estado: 'DEVOLUCION_SOLICITADA' as const, devolucion: solicitud }
        : compra
    );

    if (!this.guardarCompras(compras)) return false;

    const producto = this.getJuegoPorId(pedido.juegoId);
    if (producto) producto.stock++;

    return true;
  }

  private leerCompras(): CompraLocal[] {
    if (!this.navegador) return [];
    try {
      const datos: unknown = JSON.parse(localStorage.getItem(this.claveCompras) ?? '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  private guardarCompras(compras: CompraLocal[]): boolean {
    if (!this.navegador) return false;
    try {
      localStorage.setItem(this.claveCompras, JSON.stringify(compras));
      return true;
    } catch {
      return false;
    }
  }
}
