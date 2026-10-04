import { Routes } from '@angular/router';
import { ChatPage } from './app';
import { HomePage } from './home-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'chat', component: ChatPage },
  { path: '**', redirectTo: '' },
];
