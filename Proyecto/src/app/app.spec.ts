import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';

describe('App', () => {
  it('muestra la navegación y el pie de página', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const pagina: HTMLElement = fixture.nativeElement;
    expect(pagina.querySelector('app-navbar')?.textContent).toContain('MANU_GAMES');
    expect(pagina.querySelector('app-footer')).toBeTruthy();
  });
});
