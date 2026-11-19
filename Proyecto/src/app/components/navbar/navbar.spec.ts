import { Router, provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('busca por inicio del título y envía al catálogo en un solo envío', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.onSearchInput('m');
    expect(component.resultadosBusqueda.some(juego => juego.titulo.includes('Grand Theft'))).toBe(false);
    component.onSearchInput('c');
    expect(component.resultadosBusqueda.length).toBeGreaterThan(0);
    expect(component.resultadosBusqueda.every(juego => juego.titulo.toLowerCase().startsWith('c'))).toBe(true);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/inicio'], {
      queryParams: { q: 'c', producto: null, juegoId: null }, queryParamsHandling: 'merge'
    });
    component.seleccionarJuego(component.resultadosBusqueda[0]);
    expect(navigate.mock.lastCall?.[1]?.queryParams?.['juegoId']).toBeNull();
    expect(navigate.mock.lastCall?.[1]?.queryParams?.['producto']).toBe(component.resultadosBusqueda[0].id);
  });});
