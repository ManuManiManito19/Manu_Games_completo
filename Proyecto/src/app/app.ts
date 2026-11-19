import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';
import { CookieBanner } from './components/cookie-banner/cookie-banner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, CookieBanner],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = 'front-end';
}