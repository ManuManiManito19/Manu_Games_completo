import { Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio';
import { Login } from './components/login/login';
import { MisProductosComponent } from './components/mis-productos/mis-productos';

import { requiereSesion } from './services/require-session.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { path: 'login', component: Login },
  { path: 'mis-productos', component: MisProductosComponent, canActivate: [requiereSesion] },
  { path: '**', redirectTo: 'inicio' }
];