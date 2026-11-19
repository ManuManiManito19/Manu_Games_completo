import { webcrypto } from 'node:crypto';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { Login } from '../login/login';
import { MisProductosComponent } from './mis-productos';

describe('Mis pedidos', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('crypto', webcrypto);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('redirige al login cuando se abre el historial sin sesión', async () => {
    const harness = await RouterTestingHarness.create('/mis-productos');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).toContain('INICIAR_SESION');
  });

  it('empieza vacío y conserva compras y devoluciones por cuenta', async () => {
    const auth = TestBed.inject(AuthService);
    const juegos = TestBed.inject(GameService);
    await auth.registrar('Manu', 'manu@example.com', 'Demo739', auth.DEFAULT_AVATARS[0]);
    const harness = await RouterTestingHarness.create('/mis-productos');
    expect(harness.routeNativeElement?.textContent).toContain('Aún no tienes pedidos');
    expect(harness.routeNativeElement?.querySelector('table')).toBeNull();

    const juego = juegos.getJuegoPorId(3)!;
    const pedido = juegos.realizarCompraDirecta(juego, 'OXXO');
    expect(pedido).toBeTruthy();

    auth.cerrarSesion();
    expect(juegos.realizarCompraDirecta(juego, 'OXXO')).toBeNull();
    await auth.registrar('Otra cuenta', 'otra@example.com', 'Prueba751', auth.DEFAULT_AVATARS[1]);
    expect(juegos.getMisCompras()).toEqual([]);
    expect(juegos.validarClaveLicencia(pedido!.claveLicencia)).toBeUndefined();

    auth.cerrarSesion();
    const login = await harness.navigateByUrl('/login', Login);
    login.form.email = 'MANU@example.com';
    login.form.password = 'Demo739';
    await login.submitForm();
    expect(TestBed.inject(Router).url).toBe('/inicio');
    expect(auth.getPerfilUsuario()?.gamertag).toBe('Manu');

    const historial = await harness.navigateByUrl('/mis-productos', MisProductosComponent);
    expect(historial.misCompras.map(compra => compra.idCompra)).toEqual([pedido!.idCompra]);
    historial.abrirFormularioDevolucion(pedido!);
    historial.detallesMotivo = 'Solicitud de prueba';
    vi.useFakeTimers();
    try {
      historial.enviarSolicitudDevolucion();
      vi.advanceTimersByTime(59_999);
      expect(historial.misCompras[0].estado).toBe('DEVOLUCION_SOLICITADA');
      vi.advanceTimersByTime(1);
      expect(historial.misCompras[0].estado).toBe('REEMBOLSADO');
      expect(juegos.getMisCompras()[0].estado).toBe('REEMBOLSADO');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rechaza contraseñas cortas y secuencias, y valida el acceso registrado', async () => {
    const auth = TestBed.inject(AuthService);
    for (const clave of ['A1b2C', '123456', '654321', '111111', '121212', '789012']) {
      expect(auth.validarContrasena(clave)).not.toBeNull();
    }
    expect(auth.validarContrasena('749205')).toBeNull();

    await auth.registrar('Manu', 'manu@example.com', '749205', auth.DEFAULT_AVATARS[0]);
    auth.cerrarSesion();
    await expect(auth.iniciarSesion('manu@example.com', '729405')).rejects.toThrow('incorrectos');
    expect(auth.isLoggedIn()).toBe(false);
    await auth.iniciarSesion('manu@example.com', '749205');
    expect(auth.isLoggedIn()).toBe(true);
  });
});
