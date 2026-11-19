import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class FooterComponent {
  currentYear: number = new Date().getFullYear();
  showModal: boolean = false;
  modalTitle: string = '';
  modalType: 'terms' | 'privacy' | 'returns' | '' = '';

  openLegalModal(type: 'terms' | 'privacy' | 'returns'): void {
    this.modalType = type;
    if (type === 'terms') {
      this.modalTitle = 'TÉRMINOS Y CONDICIONES DE USO';
    } else if (type === 'privacy') {
      this.modalTitle = 'AVISO DE PRIVACIDAD INTEGRAL';
    } else if (type === 'returns') {
      this.modalTitle = 'POLÍTICA DE GARANTÍAS Y DEVOLUCIONES';
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalType = '';
  }
}

// Exportación doble para resolver importaciones como Footer o FooterComponent
export { FooterComponent as Footer };