import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UsuarioPerfil {
  gamertag: string;
  email: string;
  avatarUrl: string;
  tarjetaGuardada?: string;
}

interface CuentaLocal {
  perfil: UsuarioPerfil;
  sal: string;
  verificador: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly claveCuentas = 'manu_games_cuentas_demo';
  private readonly claveSesion = 'manu_games_sesion_demo';
  private readonly usuarioSubject = new BehaviorSubject<UsuarioPerfil | null>(this.cargarSesion());
  readonly usuario$ = this.usuarioSubject.asObservable();

  readonly DEFAULT_AVATARS = ['Memo', 'Cyber', 'Gamer', 'Neon', 'Hacker']
    .map(nombre => `https://api.dicebear.com/7.x/bottts/svg?seed=${nombre}`);

  getPerfilUsuario(): UsuarioPerfil | null {
    return this.usuarioSubject.value;
  }

  isLoggedIn(): boolean {
    return this.getPerfilUsuario() !== null;
  }

  validarContrasena(contrasena: string): string | null {
    if (Array.from(contrasena).length < 6 || !contrasena.trim()) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (/^\d+$/.test(contrasena)) {
      const digitos = Array.from(contrasena, Number);
      const ascendente = digitos.slice(1).every((digito, i) => digito === (digitos[i] + 1) % 10);
      const descendente = digitos.slice(1).every((digito, i) => digito === (digitos[i] + 9) % 10);

      if (/^(\d+)\1+$/.test(contrasena) || ascendente || descendente) {
        return 'Evita números repetidos o en serie, como 111111, 123456 o 654321.';
      }
    }

    return null;
  }

  async registrar(gamertag: string, correo: string, contrasena: string, avatarUrl: string): Promise<void> {
    const error = this.validarContrasena(contrasena);
    if (error) throw new Error(error);

    const email = correo.trim().toLowerCase();
    const sal = Array.from(crypto.getRandomValues(new Uint8Array(16)),
      byte => byte.toString(16).padStart(2, '0')).join('');
    const verificador = await this.derivarContrasena(contrasena, sal);
    const cuentas = this.cargarCuentas();

    if (cuentas.some(cuenta => cuenta.perfil.email === email)) {
      throw new Error('Ya existe una cuenta con ese correo.');
    }

    const perfil = { gamertag: gamertag.trim(), email, avatarUrl };
    localStorage.setItem(this.claveCuentas, JSON.stringify([...cuentas, { perfil, sal, verificador }]));
    this.activarSesion(perfil);
  }

  async iniciarSesion(correo: string, contrasena: string): Promise<void> {
    const email = correo.trim().toLowerCase();
    const cuenta = this.cargarCuentas().find(item => item.perfil.email === email);

    if (!cuenta || await this.derivarContrasena(contrasena, cuenta.sal) !== cuenta.verificador) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    this.activarSesion(cuenta.perfil);
  }

  cerrarSesion(): void {
    if (this.navegador) localStorage.removeItem(this.claveSesion);
    this.usuarioSubject.next(null);
  }

  actualizarTarjetaGuardada(ultimos4Digitos: string): void {
    const perfil = this.getPerfilUsuario();
    if (perfil) {
      this.usuarioSubject.next({ ...perfil, tarjetaGuardada: `•••• •••• •••• ${ultimos4Digitos}` });
    }
  }

  private activarSesion(perfil: UsuarioPerfil): void {
    localStorage.setItem(this.claveSesion, perfil.email);
    this.usuarioSubject.next(perfil);
  }

  private cargarSesion(): UsuarioPerfil | null {
    if (!this.navegador) return null;
    try {
      const email = localStorage.getItem(this.claveSesion);
      return this.cargarCuentas().find(cuenta => cuenta.perfil.email === email)?.perfil ?? null;
    } catch {
      return null;
    }
  }

  private cargarCuentas(): CuentaLocal[] {
    if (!this.navegador) return [];
    const cuentas: unknown = JSON.parse(localStorage.getItem(this.claveCuentas) ?? '[]');
    return Array.isArray(cuentas) ? cuentas : [];
  }

  private async derivarContrasena(contrasena: string, sal: string): Promise<string> {
    const texto = new TextEncoder();
    const material = await crypto.subtle.importKey('raw', texto.encode(contrasena), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: texto.encode(sal),
      iterations: 120_000,
      hash: 'SHA-256'
    }, material, 256);

    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
