import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSidenavModule,
  ],
  template: `
    <mat-toolbar color="primary" class="elevation-2">
      <mat-icon>account_tree</mat-icon>
      <span style="margin-left: 8px;">Network Diagram Editor</span>
      
      <span style="flex: 1;"></span>
      
      <button mat-icon-button>
        <mat-icon>light_mode</mat-icon>
      </button>
    </mat-toolbar>

    <div style="display: flex; height: calc(100vh - 64px);">
      <!-- Component Library Sidebar -->
      <mat-sidenav-container style="flex: 1;">
        <mat-sidenav mode="side" opened style="width: 280px; background: var(--surface-color);">
          <div style="padding: 16px;">
            <h3 style="margin-top: 0; color: var(--text-primary);">Device Library</h3>
            
            <mat-card style="margin-bottom: 16px;">
              <mat-card-header>
                <mat-card-title>Network Devices</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px;">
                  <button mat-raised-button color="primary">Router</button>
                  <button mat-raised-button color="primary">Switch</button>
                  <button mat-raised-button color="primary">Server</button>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-header>
                <mat-card-title>Computers</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px;">
                  <button mat-raised-button color="accent">Desktop</button>
                  <button mat-raised-button color="accent">Laptop</button>
                  <button mat-raised-button color="accent">Tablet</button>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-sidenav>

        <mat-sidenav-content>
          <!-- Main Canvas Area -->
          <div style="background: var(--canvas-background); height: 100%; display: flex; align-items: center; justify-content: center;">
            <mat-card style="padding: 32px; text-align: center;">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: var(--primary-color);">
                    account_tree
                  </mat-icon>
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <h2 style="color: var(--text-primary); margin: 16px 0;">Welcome to Network Diagram Editor</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">
                  Material Theme Configuration Successful!
                </p>
                <div style="display: flex; gap: 16px; justify-content: center;">
                  <button mat-raised-button color="primary">
                    <mat-icon>add</mat-icon>
                    New Project
                  </button>
                  <button mat-stroked-button color="accent">
                    <mat-icon>folder_open</mat-icon>
                    Open Project
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>

      <!-- Properties Panel -->
      <div style="width: 300px; background: var(--surface-color); border-left: 1px solid var(--border-color); padding: 16px;">
        <h3 style="margin-top: 0; color: var(--text-primary);">Properties</h3>
        
        <mat-card>
          <mat-card-header>
            <mat-card-title>Theme Test</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button mat-button color="primary">Primary Button</button>
              <button mat-raised-button color="accent">Accent Button</button>
              <button mat-stroked-button color="warn">Warning Button</button>
              <button mat-flat-button disabled>Disabled Button</button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `]
})

export class AppComponent {
  title = 'drawing-computer-diagrams';
}
