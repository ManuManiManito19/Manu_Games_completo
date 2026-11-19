import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly changeDetector = inject(ChangeDetectorRef);
  isRegisterMode: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

  selectedAvatar: string = 'https://api.dicebear.com/7.x/bottts/svg?seed=Memo';

  form = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  };

  showModal: boolean = false;
  modalTitle: string = '';
  modalType: 'terms' | 'privacy' | '' = '';

  constructor(
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (this.authService.DEFAULT_AVATARS && this.authService.DEFAULT_AVATARS.length > 0) {
      this.selectedAvatar = this.authService.DEFAULT_AVATARS[0];
    }
  }

  setMode(isRegister: boolean): void {
    this.isRegisterMode = isRegister;
    this.errorMessage = '';
  }

  selectAvatar(av: string): void {
    this.selectedAvatar = av;
  }

  openLegalModal(type: 'terms' | 'privacy'): void {
    this.modalType = type;
    this.modalTitle = type === 'terms' ? 'TÉRMINOS Y CONDICIONES' : 'AVISO DE PRIVACIDAD';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  acceptTermsFromModal(): void {
    this.form.acceptTerms = true;
    this.closeModal();
  }

  async submitForm(): Promise<void> {
    if (this.isLoading) return;
    this.errorMessage = '';

    if (!this.form.email.trim() || !this.form.password.trim() ||
      (this.isRegisterMode && !this.form.name.trim())) {
      this.errorMessage = 'Completa todos los campos obligatorios.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      this.errorMessage = 'Ingresa un correo electrónico válido.';
      return;
    }

    if (this.isRegisterMode && this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.isRegisterMode && !this.form.acceptTerms) {
      this.errorMessage = 'Debes aceptar los Términos y Condiciones.';
      return;
    }

    this.isLoading = true;
    try {
      if (this.isRegisterMode) {
        await this.authService.registrar(
          this.form.name, this.form.email, this.form.password, this.selectedAvatar
        );
      } else {
        await this.authService.iniciarSesion(this.form.email, this.form.password);
      }

      this.form.password = '';
      this.form.confirmPassword = '';
      const juegoId = Number(this.route.snapshot.queryParamMap.get('juegoId'));
      await this.router.navigate(['/inicio'], { queryParams: juegoId > 0 ? { juegoId } : {} });
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'No se pudo acceder a la cuenta.';
    } finally {
      this.isLoading = false;
      this.changeDetector.markForCheck();
    }
  }
}
