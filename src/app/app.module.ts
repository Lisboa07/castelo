import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { XuliaPageComponent } from './xulia-page/xulia-page.component';
import { ResgatePrincesaComponent } from './resgate-princesa/resgate-princesa.component';

@NgModule({
  declarations: [
    AppComponent,
    ResgatePrincesaComponent,
    XuliaPageComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
