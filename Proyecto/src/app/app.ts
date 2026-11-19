import { Component } from '@angular/core';
import { Store } from './store/store';

@Component({selector:'app-root',imports:[Store],template:'<app-store />'})
export class AppComponent {}
