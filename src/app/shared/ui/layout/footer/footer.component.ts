/** Footer: pie de página — enlaces, redes sociales y versión. */

import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Interfaces del footer */
interface FooterLink {
  label: string;
  url: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

/* Modelo de enlace social */
interface SocialLink {
  name: string;
  url: string;
  icon: string;
  ariaLabel: string;
  color: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  /* Señal del año (privada) */
  private readonly _currentYear = signal<number>(new Date().getFullYear());

  /* Señal pública de solo lectura para las plantillas */
  readonly currentYear = this._currentYear.asReadonly();

  /* Constantes públicas */
  readonly APP_VERSION = 'v2.0.0';
  readonly APP_NAME = 'MINDHUB';

  /* Enlaces sociales */
  readonly socialLinks: SocialLink[] = [
    {
      name: 'facebook',
      url: 'https://www.facebook.com',
      icon: 'facebook',
      ariaLabel: 'Síguenos en Facebook',
      color: '#1877f2'
    },
    {
      name: 'linkedin',
      url: 'https://www.linkedin.com',
      icon: 'linkedin',
      ariaLabel: 'Síguenos en LinkedIn',
      color: '#0077b5'
    },
    {
      name: 'github',
      url: 'https://github.com',
      icon: 'github',
      ariaLabel: 'Síguenos en GitHub',
      color: '#333333'
    }
  ];

  /* Enlaces del pie de página organizados por sección */
  readonly footerLinks = computed((): FooterSection[] => [
    {
      title: 'Producto',
      links: [
        { label: 'Características', url: '/features' },
        { label: 'Precios', url: '/pricing' },
        { label: 'API', url: '/api' }
      ]
    },
    {
      title: 'Compañía',
      links: [
        { label: 'Acerca de', url: '/about' },
        { label: 'Blog', url: '/blog' },
        { label: 'Carreras', url: '/careers' }
      ]
    },
    {
      title: 'Soporte',
      links: [
        { label: 'Centro de ayuda', url: '/help' },
        { label: 'Contacto', url: '/contact' },
        { label: 'Estado', url: '/status' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacidad', url: '/privacy' },
        { label: 'Términos', url: '/terms' },
        { label: 'Cookies', url: '/cookies' }
      ]
    }
  ]);

  /* Métodos públicos */
  navigateTo(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
