import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, ProductoComprado, SolicitudDevolucion } from '../../services/game.service';

@Component({
  selector: 'app-mis-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-productos.html',
  styleUrl: './mis-productos.css'
})
export class MisProductosComponent implements OnInit, OnDestroy {
  private readonly cambios = inject(ChangeDetectorRef);
  private temporizador?: ReturnType<typeof setTimeout>;
  readonly etiquetasEstado = {
    ACTIVO: 'Activo',
    DEVOLUCION_SOLICITADA: 'Devolución en proceso',
    REEMBOLSADO: 'Devolución completada'
  };
  misCompras: ProductoComprado[] = [];
  mostrarModalDevolucion: boolean = false;

  // Formulario Devolución
  claveIngresada: string = '';
  motivoSeleccionado: string = 'DEFECTO';
  metodoReembolso: string = 'ORIGEN_PAGO';
  detallesMotivo: string = '';
  errorClave: string = '';

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.cargarCompras();
  }

  get tieneComprasActivas(): boolean {
    return this.misCompras.some(compra => compra.estado === 'ACTIVO');
  }

  cargarCompras(): void {
    clearTimeout(this.temporizador);
    this.misCompras = this.gameService.getMisCompras();
    this.cambios.markForCheck();

    const pendientes = this.misCompras
      .filter(compra => compra.estado === 'DEVOLUCION_SOLICITADA' && compra.finDevolucion !== undefined)
      .map(compra => compra.finDevolucion!);
    if (pendientes.length) {
      const espera = Math.max(0, Math.min(...pendientes) - Date.now());
      this.temporizador = setTimeout(() => this.cargarCompras(), espera);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizador);
  }

  abrirFormularioDevolucion(compra?: ProductoComprado): void {
    this.errorClave = '';
    if (compra) {
      this.claveIngresada = compra.claveLicencia;
    } else {
      this.claveIngresada = '';
    }
    this.motivoSeleccionado = 'DEFECTO';
    this.metodoReembolso = 'ORIGEN_PAGO';
    this.detallesMotivo = '';
    this.mostrarModalDevolucion = true;
  }

  cerrarModalDevolucion(): void {
    this.mostrarModalDevolucion = false;
  }

  enviarSolicitudDevolucion(): void {
    this.errorClave = '';

    const claveClean = this.claveIngresada ? this.claveIngresada.trim().toUpperCase() : '';

    if (!claveClean) {
      this.errorClave = 'ERROR: La clave de licencia no puede estar vacía o ser nula.';
      return;
    }

    const compraValida = this.gameService.validarClaveLicencia(claveClean);

    if (!compraValida) {
      this.errorClave = 'ERROR DE VALIDACIÓN: La clave ingresada no existe en el sistema o ya fue devuelta previamente.';
      return;
    }

    if (!compraValida.precio || compraValida.precio <= 0) {
      this.errorClave = 'ERROR: El monto original de compra es nulo o negativo, no procede devolución.';
      return;
    }

    const detallesClean = this.detallesMotivo ? this.detallesMotivo.trim() : '';
    if (!detallesClean || detallesClean.length < 5) {
      this.errorClave = 'ERROR DE VALIDACIÓN: Debe ingresar una explicación/motivo de al menos 5 caracteres.';
      return;
    }

    const solicitud: SolicitudDevolucion = {
      claveLicencia: claveClean,
      motivo: this.motivoSeleccionado,
      metodoReembolso: this.metodoReembolso,
      detallesAdicionales: detallesClean,
      fechaSolicitud: new Date().toISOString()
    };

    if (!this.gameService.procesarDevolucion(solicitud)) {
      this.errorClave = 'No se pudo guardar la solicitud de devolución.';
      return;
    }

    this.cerrarModalDevolucion();
    this.cargarCompras();
  }
}
