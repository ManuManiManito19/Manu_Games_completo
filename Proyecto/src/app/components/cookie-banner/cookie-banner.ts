import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.css'
})
export class CookieBannerComponent implements OnInit {
  mostrarBanner: boolean = false;
  showPrivacyModal: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (this.isBrowser()) {
      const acepto = localStorage.getItem('manu_games_cookies_accepted');
      if (!acepto) {
        this.mostrarBanner = true;
      }
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined';
  }

  // Aceptar todas las cookies
  acceptCookies(): void {
    if (this.isBrowser()) {
      localStorage.setItem('manu_games_cookies_accepted', 'true');
    }
    this.mostrarBanner = false;
  }

  // Alias por si alguna otra vista llama a la función en español
  aceptarCookies(): void {
    this.acceptCookies();
  }

  // Rechazar cookies opcionales
  declineCookies(): void {
    if (this.isBrowser()) {
      localStorage.setItem('manu_games_cookies_accepted', 'false');
    }
    this.mostrarBanner = false;
  }

  // Abrir modal de políticas de privacidad/cookies
  openPrivacyModal(): void {
    this.showPrivacyModal = true;
  }

  closePrivacyModal(): void {
    this.showPrivacyModal = false;
  }
}

// Exportación doble para resolver importaciones como CookieBanner o CookieBannerComponent
export { CookieBannerComponent as CookieBanner };