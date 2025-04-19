import { Routes } from '@angular/router';
import { FarmaciaComponent } from './componentes/farmacia/farmacia.component';

export const routes: Routes = [
  { path: 'farmacia', component: FarmaciaComponent },
  { path: '', redirectTo: '/farmacia', pathMatch: 'full' }, 
];
