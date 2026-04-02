import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResgatePrincesaComponent } from './resgate-princesa/resgate-princesa.component';
import { XuliaPageComponent } from './xulia-page/xulia-page.component';

const routes: Routes = [
  { path: '', component: ResgatePrincesaComponent },
  { path: 'xulia', component: XuliaPageComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
