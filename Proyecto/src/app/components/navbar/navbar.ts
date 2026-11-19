import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GameService, Juego } from '../../services/game.service';
import { AuthService, UsuarioPerfil } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  searchTerm: string = '';
  resultadosBusqueda: Juego[] = [];
  mostrarResultados: boolean = false;
  mostrarModalPerfil: boolean = false;

  usuarioSesion: UsuarioPerfil | null = null;

  constructor(
    public gameService: GameService,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.changeDetector.markForCheck();
      const juego = this.gameService.getJuegoPorId(Number(params.get('juegoId')));
      this.searchTerm = params.get('q') ?? juego?.titulo ?? '';
      this.mostrarResultados = false;
    });

    this.authService.usuario$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(perfil => {
      this.usuarioSesion = perfil;
      this.changeDetector.markForCheck();
    });
  }

  get perfil(): UsuarioPerfil | null {
    return this.usuarioSesion;
  }

  get estaAutenticado(): boolean {
    return this.usuarioSesion !== null;
  }

  toggleCuadroPerfil(): void {
    if (this.estaAutenticado) {
      this.mostrarModalPerfil = !this.mostrarModalPerfil;
    } else {
      this.router.navigate(['/login']);
    }
  }

  toggleModalPerfil(): void {
    this.toggleCuadroPerfil();
  }

  cerrarModalPerfil(): void {
    this.mostrarModalPerfil = false;
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.mostrarModalPerfil = false;
    this.router.navigate(['/login']);
  }

  onSearchInput(texto: string): void {
    this.searchTerm = texto;
    const query = this.searchTerm.trim();
    if (query.length > 0) {
      const categoria = this.route.snapshot.queryParamMap.get('categoria') ?? '';
      this.resultadosBusqueda = this.gameService.buscarJuegos(query, categoria);
      this.mostrarResultados = true;
    } else {
      this.resultadosBusqueda = [];
      this.mostrarResultados = false;
    }
  }

  ejecutarBusquedaEnter(): void {
    const query = this.searchTerm.trim();
    const categoria = this.route.snapshot.queryParamMap.get('categoria') ?? '';
    const exacto = this.gameService.buscarJuegos(query, categoria).find(juego =>
      juego.titulo.localeCompare(query, 'es', { sensitivity: 'base' }) === 0
    );
    this.mostrarBusqueda(query, exacto?.id);
  }

  seleccionarJuego(juego: Juego): void {
    this.mostrarBusqueda(juego.titulo, juego.id);
  }

  private mostrarBusqueda(texto: string, producto?: number): void {
    this.mostrarResultados = false;
    this.searchTerm = texto;
    void this.router.navigate(['/inicio'], {
      queryParams: { q: texto || null, producto: producto ?? null, juegoId: null },
      queryParamsHandling: 'merge'
    });
  }

  irAMisPedidos(): void {
    this.cerrarModalPerfil();
    void this.router.navigate(['/mis-productos']);
  }
}