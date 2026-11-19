import { webcrypto } from 'node:crypto';
import { AuthService } from '../../services/auth.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { InicioComponent } from './inicio';

describe('Catálogo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('crypto', webcrypto);
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'inicio', component: InicioComponent }])]
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('distingue los juegos base de sus expansiones y combina categoría con búsqueda', async () => {
    const harness = await RouterTestingHarness.create('/inicio?q=elden%20ring');
    const catalogo = harness.routeNativeElement!;
    const tarjetas = () => [...catalogo.querySelectorAll('.game-card h3')]
      .map(titulo => titulo.textContent.trim());
    expect(tarjetas()).toEqual(['Elden Ring: Shadow of the Erdtree', 'Elden Ring']);

    const select = catalogo.querySelector('select')!;
    select.value = 'DLC';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/inicio?q=elden%20ring&categoria=DLC');
    expect(tarjetas()).toEqual(['Elden Ring: Shadow of the Erdtree']);

    await harness.navigateByUrl('/inicio?q=elden%20ring&categoria=Suscripciones');
    await harness.fixture.whenStable();
    expect(catalogo.querySelector('.catalog-empty')?.textContent).toContain('No se encontraron');
  });

  it('muestra las cuatro suscripciones y conserva el filtro tras una compra simulada', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.registrar('Manu', 'manu@example.com', 'Prueba72', auth.DEFAULT_AVATARS[0]);
    const harness = await RouterTestingHarness.create('/inicio?categoria=Suscripciones');
    const catalogo = harness.routeNativeElement!;
    const tarjetas = catalogo.querySelectorAll('.game-card');

    expect([...tarjetas].map(tarjeta => tarjeta.querySelector('h3')?.textContent.trim())).toEqual([
      'PlayStation Plus Essential — 1 mes',
      'PlayStation Plus Essential — 3 meses',
      'Xbox Game Pass Ultimate — 1 mes',
      'Xbox Game Pass Ultimate — 3 meses'
    ]);

    tarjetas[0].querySelector('button')!.click();
    harness.detectChanges();
    catalogo.querySelectorAll<HTMLButtonElement>('.btn-payment')[1].click();
    catalogo.querySelector<HTMLButtonElement>('.modal-footer .btn-accent')!.click();
    harness.detectChanges();

    expect(catalogo.querySelector('.alert-success')?.textContent).toContain('COMPRA SIMULADA');
    expect(catalogo.querySelectorAll('.game-card')).toHaveLength(4);
    expect(catalogo.querySelector('.stock-info')?.textContent).toContain('19');
  });

  it('encuentra monedas aunque la consulta omita el acento', async () => {
    const harness = await RouterTestingHarness.create('/inicio?categoria=Monedas+virtuales&q=Halo%20Infinite%20%E2%80%94%201%2C000%20creditos');
    const tarjetas = harness.routeNativeElement!.querySelectorAll('.game-card h3');
    expect([...tarjetas].map(titulo => titulo.textContent.trim())).toEqual([
      'Halo Infinite — 1,000 créditos'
    ]);
  });
});
