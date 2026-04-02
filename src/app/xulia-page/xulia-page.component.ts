import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-xulia-page',
  templateUrl: './xulia-page.component.html',
  styleUrls: ['./xulia-page.component.css'],
})
export class XuliaPageComponent {
  /** Senha de 6 dígitos: 16 · 03 · 25 → 160325 */
  private readonly secretPin = '160325';

  /** Modal pedido de senha antes da pasta secreta. */
  showPasswordGate = false;

  /** Conteúdo da pasta secreta. */
  showSecretFolder = false;

  passwordPin = '';
  passwordError = false;

  openSecretFolder(): void {
    this.passwordPin = '';
    this.passwordError = false;
    this.showPasswordGate = true;
  }

  closePasswordGate(): void {
    this.showPasswordGate = false;
    this.passwordPin = '';
    this.passwordError = false;
  }

  submitPassword(): void {
    const digits = this.passwordPin.replace(/\D/g, '');
    if (digits === this.secretPin) {
      this.showPasswordGate = false;
      this.showSecretFolder = true;
      this.passwordError = false;
      this.passwordPin = '';
    } else {
      this.passwordError = true;
    }
  }

  closeSecretFolder(): void {
    this.showSecretFolder = false;
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    if (this.showSecretFolder) {
      this.closeSecretFolder();
    } else if (this.showPasswordGate) {
      this.closePasswordGate();
    }
  }
}
