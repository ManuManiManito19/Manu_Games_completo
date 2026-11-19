import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService, Juego, ProductoComprado } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class InicioComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly gameService = inject(GameService);
  readonly generos = this.gameService.getCategoriasJuegos();
  readonly categoriasComplementos = this.gameService.getCategoriasComplementos();
  categoriaSeleccionada = '';
  busqueda = '';
  juegos: Juego[] = [];
  juegoSeleccionado: Juego | null = null;
  compraExitosa: ProductoComprado | null = null;

  metodoPagoSeleccionado: 'TARJETA' | 'OXXO' | 'PAYPAL' = 'TARJETA';
  numeroTarjeta: string = '';
  titularTarjeta: string = '';
  expiracion: string = '';
  cvv: string = '';
  correoPaypal: string = '';
  referenciaOxxo: string = '';
  
  errorPago: string = '';

  constructor(
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.changeDetector.markForCheck();
      const categoria = params.get('categoria') ?? '';
      const categorias = ['juegos', 'complementos', ...this.generos, ...this.categoriasComplementos];
      this.categoriaSeleccionada = categorias.includes(categoria) ? categoria : '';
      this.busqueda = params.get('q') ?? '';
      this.cargarJuegos();

      const juego = this.gameService.getJuegoPorId(Number(params.get('juegoId')));
      if (juego) {
        this.abrirMenuCompra(juego);
      }
    });
  }

  cargarJuegos(): void {
    const resultados = this.gameService.buscarJuegos(this.busqueda, this.categoriaSeleccionada);
    const producto = this.route.snapshot.queryParamMap.get('producto');
    this.juegos = producto ? resultados.filter(juego => juego.id === Number(producto)) : resultados;
  }

  cambiarCategoria(categoria: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoria: categoria || null, producto: null, juegoId: null },
      queryParamsHandling: 'merge'
    });
  }

  limpiarFiltros(): void {
    void this.router.navigate(['/inicio']);
  }

  abrirMenuCompra(juego: Juego): void {
    if (!this.authService.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { juegoId: juego.id } });
      return;
    }

    this.limpiarDatosPago();
    this.juegoSeleccionado = juego;
    this.compraExitosa = null;
    this.errorPago = '';
    this.metodoPagoSeleccionado = 'TARJETA';
    this.referenciaOxxo = `OXXO-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  }

  cerrarMenuCompra(): void {
    this.juegoSeleccionado = null;
    this.compraExitosa = null;
    this.errorPago = '';
    this.limpiarDatosPago();

    if (this.route.snapshot.queryParamMap.has('juegoId')) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { juegoId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  irAMisPedidos(): void {
    void this.router.navigate(['/mis-productos']);
  }

  private limpiarDatosPago(): void {
    this.numeroTarjeta = '';
    this.titularTarjeta = '';
    this.expiracion = '';
    this.cvv = '';
    this.correoPaypal = '';
  }

  procesarCompra(): void {
    if (this.compraExitosa) return;

    if (!this.authService.isLoggedIn()) {
      this.errorPago = 'Inicia sesión para confirmar tu pedido.';
      return;
    }

    if (!this.juegoSeleccionado) {
      this.errorPago = 'ERROR: No se ha seleccionado un producto válido.';
      return;
    }

    // VERIFICACIÓN DE STOCK DISPONIBLE
    if (this.juegoSeleccionado.stock <= 0) {
      this.errorPago = 'ERROR: El producto seleccionado no tiene unidades disponibles en stock.';
      return;
    }

    if (this.juegoSeleccionado.precio <= 0) {
      this.errorPago = 'ERROR: El importe del producto no puede ser nulo o negativo.';
      return;
    }

    this.errorPago = '';
    let ultimosCuatroDigitos = '';

    if (this.metodoPagoSeleccionado === 'TARJETA') {
      const numClean = this.numeroTarjeta ? this.numeroTarjeta.trim() : '';
      const titularClean = this.titularTarjeta ? this.titularTarjeta.trim() : '';
      const cvvClean = this.cvv ? this.cvv.trim() : '';
      const expClean = this.expiracion ? this.expiracion.trim() : '';

      if (!numClean || !titularClean || !cvvClean || !expClean) {
        this.errorPago = 'ERROR DE VALIDACIÓN: Todos los campos de la tarjeta son obligatorios.';
        return;
      }

      if (!/^\d{16}$/.test(numClean)) {
        this.errorPago = 'ERROR DE VALIDACIÓN: El número de tarjeta debe contener exactamente 16 dígitos numéricos.';
        return;
      }

      if (!/^\d{3,4}$/.test(cvvClean)) {
        this.errorPago = 'ERROR DE VALIDACIÓN: El código CVV debe tener entre 3 y 4 dígitos.';
        return;
      }

      // VALIDACIÓN DE MES (01-12) Y AÑO (2026 EN ADELANTE)
      const partesFecha = expClean.split('/');
      if (partesFecha.length !== 2) {
        this.errorPago = 'ERROR DE VALIDACIÓN: Formato de vencimiento inválido. Use MM/AA (ejemplo: 08/28).';
        return;
      }

      const mes = parseInt(partesFecha[0], 10);
      let anio = parseInt(partesFecha[1], 10);

      if (anio < 100) {
        anio += 2000;
      }

      const anioActual = new Date().getFullYear();

      if (isNaN(mes) || mes < 1 || mes > 12) {
        this.errorPago = 'ERROR DE VALIDACIÓN: El mes de vencimiento debe estar estrictamente entre 01 y 12.';
        return;
      }

      if (isNaN(anio) || anio < anioActual) {
        this.errorPago = `ERROR DE VALIDACIÓN: El año debe ser igual o superior al año actual (${anioActual}).`;
        return;
      }

      ultimosCuatroDigitos = numClean.slice(-4);

    } else if (this.metodoPagoSeleccionado === 'PAYPAL') {
      const emailClean = this.correoPaypal ? this.correoPaypal.trim() : '';
      if (!emailClean || !emailClean.includes('@') || !emailClean.includes('.')) {
        this.errorPago = 'ERROR DE VALIDACIÓN: Ingrese un correo electrónico válido registrado en PayPal.';
        return;
      }
    }

    let textoMetodo = 'TARJETA DE CRÉDITO/DÉBITO';
    if (this.metodoPagoSeleccionado === 'OXXO') textoMetodo = 'OXXO PAY (EFECTIVO)';
    if (this.metodoPagoSeleccionado === 'PAYPAL') textoMetodo = 'PAYPAL';

    // Procesar la compra y reducir stock
    const resultado = this.gameService.realizarCompraDirecta(this.juegoSeleccionado, textoMetodo);

    if (resultado) {
      if (ultimosCuatroDigitos) this.authService.actualizarTarjetaGuardada(ultimosCuatroDigitos);
      this.compraExitosa = resultado;
      this.limpiarDatosPago();
      this.cargarJuegos();
    } else {
      this.errorPago = 'ERROR: No se pudo registrar la compra simulada.';
    }
  }
}