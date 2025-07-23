import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

// Pure Konva.js import
import Konva from 'konva';

// Core models and utilities
import {
  Device,
  DeviceType,
  Point,
  CanvasMode
} from '@core/models';
import {
  DEVICE_CONFIG,
  CANVAS_CONFIG,
  APP_CONFIG
} from '@core/constants';
import {
  MathUtils,
  IdUtils,
  ValidationUtils,
  FileUtils
} from '@shared/utils';

// Services
import { ProjectStateService } from '@core/services/project-state.service';
import { EditorStateService } from '@core/services/editor-state.service';
import { UndoRedoService } from '@core/services/undo-redo.service';
import { DeviceLibraryService } from '@core/services/device-library.service';
import { ConnectionService } from '@core/services/connection.service';

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
    MatBadgeModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <mat-icon>account_tree</mat-icon>
      <span style="margin-left: 8px;">{{ appName }}</span>
      
      <!-- Project Title -->
      <span style="margin-left: 16px; font-weight: 400;">
        {{ (projectState.projectTitle$ | async) }}
      </span>

      <!-- Unsaved Changes Indicator -->
      <mat-chip 
        *ngIf="(projectState.hasUnsavedChanges$ | async)" 
        style="margin-left: 16px; background: #FF9800; color: white;">
        <mat-icon matChipTrailingIcon>edit</mat-icon>
        Unsaved
      </mat-chip>
      
      <span style="flex: 1;"></span>
      
      <!-- Auto-save Status -->
      <span style="font-size: 12px; margin-right: 16px; opacity: 0.8;">
        <mat-icon style="font-size: 16px; vertical-align: middle;">
          {{ (projectState.autoSaveEnabled$ | async) ? 'cloud_done' : 'cloud_off' }}
        </mat-icon>
        {{ (projectState.autoSaveEnabled$ | async) ? 'Auto-save ON' : 'Auto-save OFF' }}
      </span>
      
      <button mat-icon-button (click)="addDevice()">
        <mat-icon>add_circle</mat-icon>
      </button>
    </mat-toolbar>

    <div style="display: flex; height: calc(100vh - 64px);">
      
      <!-- Left Sidebar -->
      <div style="width: 320px; background: var(--surface-color); border-right: 1px solid var(--border-color); padding: 16px;">
        <h3 style="margin-top: 0; color: var(--text-primary);">✅ ProjectStateService Test</h3>
        
        <mat-card style="margin-bottom: 16px;">
          <mat-card-header>
            <mat-card-title>Project Actions</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button 
                mat-raised-button 
                color="primary" 
                (click)="createNewProject()">
                🆕 New Project
              </button>
              <button 
                mat-raised-button 
                color="accent" 
                (click)="exportProject()"
                [disabled]="!(projectState.hasActiveProject$ | async)">
                💾 Export Project
              </button>
              <button 
                mat-stroked-button 
                color="warn" 
                (click)="closeProject()"
                [disabled]="!(projectState.hasActiveProject$ | async)">
                ❌ Close Project
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- NEW: Editor Controls -->
        <mat-card style="margin-top: 16px;">
          <mat-card-header>
            <mat-card-title>Editor Controls</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              
              <!-- Mode Toggle -->
              <div style="display: flex; gap: 8px;">
                <button 
                  mat-raised-button 
                  [color]="(editorState.currentMode$ | async) === 'select' ? 'primary' : 'basic'"
                  (click)="setEditorMode('select')"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>mouse</mat-icon>
                  Select
                </button>
                <button 
                  mat-raised-button 
                  [color]="(editorState.currentMode$ | async) === 'pan' ? 'primary' : 'basic'"
                  (click)="setEditorMode('pan')"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>pan_tool</mat-icon>
                  Pan
                </button>
              </div>

              <!-- Zoom Controls -->
              <div style="display: flex; gap: 8px; align-items: center;">
                <button 
                  mat-icon-button 
                  (click)="zoomIn()"
                  [disabled]="!(editorState.canZoomIn$ | async) || !(editorState.isInitialized$ | async)">
                  <mat-icon>zoom_in</mat-icon>
                </button>
                <span style="min-width: 60px; text-align: center; font-size: 14px;">
                  {{ (editorState.zoomPercentage$ | async) }}%
                </span>
                <button 
                  mat-icon-button 
                  (click)="zoomOut()"
                  [disabled]="!(editorState.canZoomOut$ | async) || !(editorState.isInitialized$ | async)">
                  <mat-icon>zoom_out</mat-icon>
                </button>
                <button 
                  mat-icon-button 
                  (click)="resetZoom()"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>center_focus_strong</mat-icon>
                </button>
              </div>

              <!-- Connection Drawing Mode -->
              <div style="display: flex; gap: 8px;">
                <button 
                  mat-raised-button 
                  [color]="(editorState.currentMode$ | async) === 'connect' ? 'primary' : 'basic'"
                  (click)="setConnectionMode()"
                  [disabled]="!(editorState.isInitialized$ | async) || !(connectionService.isEnabled$ | async)">
                  <mat-icon>timeline</mat-icon>
                  Connect
                </button>
                <button 
                  mat-stroked-button 
                  (click)="cancelConnectionDrawing()"
                  [disabled]="!(connectionService.isDrawing$ | async)"
                  style="font-size: 11px;">
                  <mat-icon>close</mat-icon>
                  Cancel
                </button>
              </div>

              <!-- Connection Drawing Settings -->
              <div *ngIf="(editorState.currentMode$ | async) === 'connect'" 
                   style="display: flex; gap: 8px; padding: 8px; background: #F5F5F5; border-radius: 4px;">
                <span style="font-size: 11px; color: #666; align-self: center;">Drawing:</span>
                <button 
                  mat-stroked-button 
                  [color]="connectionDrawingMode === 'straight' ? 'accent' : 'basic'"
                  (click)="setConnectionDrawingMode('straight')"
                  style="font-size: 10px; padding: 2px 8px;">
                  📏 Straight
                </button>
                <button 
                  mat-stroked-button 
                  [color]="connectionDrawingMode === 'orthogonal' ? 'accent' : 'basic'"
                  (click)="setConnectionDrawingMode('orthogonal')"
                  style="font-size: 10px; padding: 2px 8px;">
                  📐 L-Shape
                </button>
              </div>

              <!-- Quick Actions -->
              <div style="display: flex; gap: 8px;">
                <button 
                  mat-stroked-button 
                  (click)="fitToScreen()"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>fit_screen</mat-icon>
                  Fit
                </button>
                <button 
                  mat-stroked-button 
                  (click)="centerCanvas()"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>gps_fixed</mat-icon>
                  Center
                </button>
              </div>

              <!-- Undo/Redo Controls -->
              <div style="display: flex; gap: 8px;">
                <button 
                  mat-stroked-button 
                  color="accent"
                  (click)="undoLastAction()"
                  [disabled]="!(undoRedoService.canUndo$ | async)">
                  <mat-icon>undo</mat-icon>
                  Undo
                </button>
                <button 
                  mat-stroked-button 
                  color="accent"
                  (click)="redoLastAction()"
                  [disabled]="!(undoRedoService.canRedo$ | async)">
                  <mat-icon>redo</mat-icon>
                  Redo
                </button>
                <button mat-stroked-button (click)="testManualBatching()">
                Test Manual Batching
                </button>
              </div>

              <!-- Enhanced Pan Controls -->
              <div style="display: flex; gap: 8px;">
                <button 
                  mat-stroked-button 
                  (click)="animatePanToCenter()"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>my_location</mat-icon>
                  Animate Center
                </button>
                <button 
                  mat-stroked-button 
                  (click)="resetPanPosition()"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>home</mat-icon>
                  Reset Pan
                </button>
              </div>

              <!-- Pan Constraints Toggle -->
              <div style="display: flex; gap: 8px;">
                <button 
                  mat-stroked-button 
                  color="warn"
                  (click)="updatePanConstraints()"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>lock</mat-icon>
                  Set Bounds
                </button>
                <button 
                  mat-stroked-button 
                  (click)="editorState.clearPanConstraints()"
                  [disabled]="!(editorState.isInitialized$ | async)">
                  <mat-icon>lock_open</mat-icon>
                  Clear Bounds
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Enhanced Device Library Panel -->
        <mat-card style="margin-top: 16px;">
          <mat-card-header>
            <mat-card-title>Device Library</mat-card-title>
            <mat-card-subtitle>{{ (deviceLibrary.searchResults$ | async)?.length || 0 }} devices available</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              
              <!-- Search Box -->
              <!-- Search Box - ПОПРАВЕНА ВЕРСИЯ -->
              <div>
                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Search devices...</mat-label>
                  <input 
                    matInput 
                    [(ngModel)]="searchQuery"
                    (input)="onSearchQueryChange($event)"
                    placeholder="Router, switch, server...">
                  
                  <!-- Search icon - показва се само когато няма текст -->
                  <mat-icon 
                    matSuffix 
                    *ngIf="!searchQuery || searchQuery.length === 0">
                    search
                  </mat-icon>
                  
                  <!-- Clear icon - показва се само когато има текст -->
                  <button 
                    matSuffix 
                    mat-icon-button 
                    *ngIf="searchQuery && searchQuery.length > 0"
                    (click)="clearDeviceSearch()"
                    title="Clear search">
                    <mat-icon>clear</mat-icon>
                  </button>
                </mat-form-field>
              </div>

              <!-- Quick Filters -->
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button 
                  mat-stroked-button 
                  [color]="showFavoritesOnly ? 'accent' : 'basic'"
                  (click)="toggleFavoritesFilter()"
                  style="font-size: 11px;">
                  <mat-icon style="font-size: 16px;">{{ showFavoritesOnly ? 'star' : 'star_border' }}</mat-icon>
                  Favorites
                </button>
                <button 
                  mat-stroked-button 
                  [color]="showRecentOnly ? 'accent' : 'basic'"
                  (click)="toggleRecentFilter()"
                  style="font-size: 11px;">
                  <mat-icon style="font-size: 16px;">history</mat-icon>
                  Recent
                </button>
                <button 
                  mat-stroked-button 
                  (click)="clearAllFilters()"
                  [disabled]="!(deviceLibrary.hasActiveFilters$ | async)"
                  style="font-size: 11px;">
                  <mat-icon style="font-size: 16px;">clear_all</mat-icon>
                  Clear
                </button>
              </div>

              <!-- Category Buttons -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="font-weight: 500; color: #666; font-size: 12px;">NETWORK DEVICES</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="addTypedDevice(DeviceType.ROUTER)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="font-size: 11px;">
                    🔀 Router
                  </button>
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="addTypedDevice(DeviceType.SWITCH)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="font-size: 11px;">
                    🔗 Switch
                  </button>
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="addTypedDevice(DeviceType.ACCESS_POINT)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="font-size: 11px;">
                    📡 WiFi AP
                  </button>
                </div>

                <div style="font-weight: 500; color: #666; font-size: 12px; margin-top: 8px;">SERVERS & COMPUTERS</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="addTypedDevice(DeviceType.SERVER)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="font-size: 11px;">
                    🖥️ Server
                  </button>
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="addTypedDevice(DeviceType.DESKTOP)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="font-size: 11px;">
                    💻 Desktop
                  </button>
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="addTypedDevice(DeviceType.LAPTOP)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="font-size: 11px;">
                    💻 Laptop
                  </button>
                </div>

                <div style="font-weight: 500; color: #666; font-size: 12px; margin-top: 8px;">PERIPHERALS</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="addTypedDevice(DeviceType.PRINTER)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="font-size: 11px;">
                    🖨️ Printer
                  </button>
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="addTypedDevice(DeviceType.STORAGE)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="font-size: 11px;">
                    💾 Storage
                  </button>
                </div>
              </div>

              <!-- Library Analytics Button -->
              <div style="margin-top: 8px;">
                <button 
                  mat-stroked-button 
                  (click)="getLibraryAnalytics()"
                  style="width: 100%; font-size: 11px;">
                  <mat-icon style="font-size: 16px;">analytics</mat-icon>
                  Show Library Analytics
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- NEW: Search Results Panel -->
        <mat-card style="margin-top: 16px;">
          <mat-card-header>
            <mat-card-title>Search Results</mat-card-title>
            <mat-card-subtitle>
              {{ (deviceLibrary.searchResults$ | async)?.length || 0 }} template(s) found
              <span *ngIf="(deviceLibrary.hasActiveFilters$ | async)" style="color: #FF9800;">
                (filtered)
              </span>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            
            <!-- Loading State -->
            <div *ngIf="(deviceLibrary.isLoading$ | async)" style="text-align: center; padding: 20px;">
              <mat-icon style="animation: spin 1s linear infinite; font-size: 24px;">refresh</mat-icon>
              <div style="margin-top: 8px; color: #666;">Loading templates...</div>
            </div>

            <!-- Empty State -->
           <!-- Empty State - ПОПРАВЕНА ВЕРСИЯ -->
            <div *ngIf="!(deviceLibrary.isLoading$ | async) && ((deviceLibrary.searchResults$ | async)?.length || 0) === 0" 
                 style="text-align: center; padding: 20px; color: #666;">
              <mat-icon style="
                font-size: 48px; 
                width: 48px; 
                height: 48px; 
                opacity: 0.3;
                color: #999;
                margin-bottom: 8px;
              ">search_off</mat-icon>
              <div style="margin-top: 8px; font-size: 14px; font-weight: 500;">
                No devices found
              </div>
              <div style="font-size: 12px; margin-top: 4px; color: #888;">
                <span *ngIf="searchQuery">No results for "{{ searchQuery }}"</span>
                <span *ngIf="!searchQuery && (deviceLibrary.hasActiveFilters$ | async)">No devices match your filters</span>
                <span *ngIf="!searchQuery && !(deviceLibrary.hasActiveFilters$ | async)">Try searching for devices</span>
              </div>
              <button 
                mat-stroked-button 
                (click)="clearAllFilters()" 
                *ngIf="(deviceLibrary.hasActiveFilters$ | async)"
                style="margin-top: 12px; font-size: 11px;">
                Clear All Filters
              </button>
            </div>

            <!-- Results Grid -->
            <div *ngIf="!(deviceLibrary.isLoading$ | async) && ((deviceLibrary.searchResults$ | async)?.length || 0) > 0"
                 style="display: grid; grid-template-columns: 1fr; gap: 8px; max-height: 400px; overflow-y: auto;">
              
              <div *ngFor="let template of (deviceLibrary.searchResults$ | async); trackBy: trackTemplate" 
                   class="template-card"
                   [style.background]="template.usage.isFavorite ? '#FFF3E0' : '#FAFAFA'"
                   [style.border]="template.usage.isFavorite ? '2px solid #FF9800' : '1px solid #E0E0E0'"
                   style="
                     padding: 12px;
                     border-radius: 8px;
                     cursor: pointer;
                     transition: all 0.2s ease;
                   "
                   (mouseenter)="onTemplateHover(template, true)"
                   (mouseleave)="onTemplateHover(template, false)"
                   (click)="onTemplateClick(template)">
                
                <!-- Template Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 13px; color: #333;">
                      {{ template.icon }} {{ template.name }}
                    </div>
                    <div style="font-size: 11px; color: #666; margin-top: 2px;">
                      {{ template.category | titlecase }} • {{ template.deviceType | titlecase }}
                    </div>
                  </div>
                  
                  <!-- Favorite Button -->
                  <button 
                    mat-icon-button 
                    (click)="toggleTemplateFavorite(template, $event)"
                    [style.color]="template.usage.isFavorite ? '#FF9800' : '#CCC'"
                    title="{{ template.usage.isFavorite ? 'Remove from favorites' : 'Add to favorites' }}"
                    style="width: 32px; height: 32px;">
                    <mat-icon style="font-size: 18px;">
                      {{ template.usage.isFavorite ? 'star' : 'star_border' }}
                    </mat-icon>
                  </button>
                </div>

                <!-- Template Description -->
                <div style="font-size: 11px; color: #555; margin-bottom: 8px; line-height: 1.3;">
                  {{ template.description }}
                </div>

                <!-- Template Metadata -->
                <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                  <span *ngFor="let tag of template.metadata.tags.slice(0, 3)" 
                        style="
                          background: #E3F2FD;
                          color: #1976D2;
                          padding: 2px 6px;
                          border-radius: 12px;
                          font-size: 10px;
                          font-weight: 500;
                        ">
                    {{ tag }}
                  </span>
                </div>

                <!-- Template Stats -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div style="font-size: 10px; color: #888;">
                    <span *ngIf="template.usage.useCount > 0">Used {{ template.usage.useCount }}x</span>
                    <span *ngIf="template.usage.useCount === 0">Never used</span>
                    <span *ngIf="template.usage.lastUsed"> • {{ template.usage.lastUsed | date:'short' }}</span>
                  </div>
                  <div style="font-size: 10px; color: #888;">
                    ⭐ {{ template.usage.popularity }}
                  </div>
                </div>

                <!-- Template Actions -->
                <div style="display: flex; gap: 6px;">
                  <button 
                    mat-stroked-button 
                    color="primary"
                    (click)="createDeviceFromTemplate(template, $event)"
                    [disabled]="!(projectState.hasActiveProject$ | async)"
                    style="flex: 1; font-size: 10px; padding: 4px 8px;">
                    <mat-icon style="font-size: 14px; margin-right: 4px;">add</mat-icon>
                    Add Device
                  </button>
                  <button 
                    mat-icon-button 
                    (click)="showTemplateDetails(template, $event)"
                    title="View details"
                    style="width: 28px; height: 28px;">
                    <mat-icon style="font-size: 16px;">info</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- NEW: Editor State Demo -->
        <mat-card style="margin-top: 16px;">
          <mat-card-header>
            <mat-card-title>Editor State</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>Initialized:</strong> {{ (editorState.isInitialized$ | async) ? '✅ Yes' : '❌ No' }}</div>
              <div><strong>Mode:</strong> {{ (editorState.currentMode$ | async) }}</div>
              <div><strong>Tool:</strong> {{ (editorState.currentTool$ | async) }}</div>
              <div><strong>Zoom:</strong> {{ (editorState.zoomPercentage$ | async) }}%</div>
              <div><strong>Can Zoom In:</strong> {{ (editorState.canZoomIn$ | async) ? '✅' : '❌' }}</div>
              <div><strong>Can Zoom Out:</strong> {{ (editorState.canZoomOut$ | async) ? '✅' : '❌' }}</div>
              <div><strong>Selection:</strong> {{ (editorState.selectionCount$ | async) }} items</div>
              <div><strong>Multi-Select:</strong> {{ (editorState.isMultiSelecting$ | async) ? '✅' : '❌' }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- NEW: Undo/Redo State -->
        <mat-card style="margin-top: 16px;">
          <mat-card-header>
            <mat-card-title>Undo/Redo State</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>Can Undo:</strong> {{ (undoRedoService.canUndo$ | async) ? '✅ Yes' : '❌ No' }}</div>
              <div><strong>Can Redo:</strong> {{ (undoRedoService.canRedo$ | async) ? '✅ Yes' : '❌ No' }}</div>
              <div><strong>History Size:</strong> {{ (undoRedoService.historySize$ | async) }} commands</div>
              <div><strong>Recording:</strong> {{ (undoRedoService.isRecording$ | async) ? '🔴 Active' : '⏸️ Paused' }}</div>
              <div><strong>Batching:</strong> {{ (undoRedoService.isBatching$ | async) ? '📦 Active' : '❌ No' }}</div>
            </div>
            <div style="margin-top: 8px;">
                <button 
                  mat-stroked-button 
                  color="warn" 
                  (click)="clearUndoHistory()" 
                  [disabled]="(undoRedoService.historySize$ | async) === 0"
                  style="font-size: 11px; padding: 4px 8px;">
                  Clear History
                </button>
              </div>
          </mat-card-content>
        </mat-card>

        <!-- NEW: Device Library State -->
        <mat-card style="margin-top: 16px;">
          <mat-card-header>
            <mat-card-title>Device Library</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>Total Templates:</strong> {{ (deviceLibrary.templateCount$ | async) }}</div>
              <div><strong>Search Results:</strong> {{ (deviceLibrary.searchResults$ | async)?.length || 0 }}</div>
              <div><strong>Favorites:</strong> {{ (deviceLibrary.favoriteTemplates$ | async)?.length || 0 }}</div>
              <div><strong>Recent:</strong> {{ (deviceLibrary.recentTemplates$ | async)?.length || 0 }}</div>
              <div><strong>Has Filters:</strong> {{ (deviceLibrary.hasActiveFilters$ | async) ? '🔧 Yes' : '❌ No' }}</div>
              <div><strong>Loading:</strong> {{ (deviceLibrary.isLoading$ | async) ? '🔄 Yes' : '✅ No' }}</div>

              <div style="margin-top: 8px;">
                <button 
                  mat-stroked-button 
                  color="accent"
                  (click)="testFavorites()"
                  style="font-size: 10px; padding: 2px 8px;">
                  🧪 Test Favorites
                </button>
              </div>

            </div>
          </mat-card-content>
        </mat-card>

        <!-- NEW: Connection Service State -->
        <mat-card style="margin-top: 16px;">
          <mat-card-header>
            <mat-card-title>Connection Service</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>Service:</strong> {{ (connectionService.isEnabled$ | async) ? '✅ Enabled' : '❌ Disabled' }}</div>
              <div><strong>Connections:</strong> {{ (connectionService.connectionCount$ | async) }}</div>
              <div><strong>Selected:</strong> {{ (connectionService.selectedConnectionCount$ | async) }}</div>
              <div><strong>Drawing:</strong> {{ (connectionService.isDrawing$ | async) ? '✏️ Active' : '❌ Inactive' }}</div>
              <div><strong>Anchors:</strong> {{ (connectionService.availableAnchorCount$ | async) }} available</div>
              <div><strong>Mode:</strong> {{ connectionDrawingMode }}</div>
              <!-- Test Buttons -->
              <div style="margin-top: 8px; display: flex; gap: 4px;">
                <button 
                  mat-stroked-button 
                  color="accent"
                  (click)="testConnectionCreation()"
                  [disabled]="!(connectionService.isEnabled$ | async)"
                  style="font-size: 10px; padding: 2px 8px;">
                  🧪 Test Connect
                </button>
                <button 
                  mat-stroked-button 
                  (click)="getConnectionAnalytics()"
                  style="font-size: 10px; padding: 2px 8px;">
                  📊 Analytics
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card style="margin-top: 16px;">
          <mat-card-header>
            <mat-card-title>Reactive State Demo</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>Has Project:</strong> {{ (projectState.hasActiveProject$ | async) ? '✅ Yes' : '❌ No' }}</div>
              <div><strong>Devices:</strong> {{ (projectState.deviceCount$ | async) }}</div>
              <div><strong>Connections:</strong> {{ (projectState.connectionCount$ | async) }}</div>
              <div><strong>Unsaved:</strong> {{ (projectState.hasUnsavedChanges$ | async) ? '⚠️ Yes' : '✅ Saved' }}</div>
              <div><strong>Loading:</strong> {{ (projectState.isLoading$ | async) ? '🔄 Yes' : '✅ No' }}</div>
              <div *ngIf="(projectState.lastSavedAt$ | async) as lastSaved">
                <strong>Last Saved:</strong> {{ lastSaved | date:'HH:mm:ss' }}
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Canvas Area -->
      <div style="flex: 1; background: var(--canvas-background); position: relative; overflow: hidden;">
        
        <!-- Project Status Banner -->
        <div style="position: absolute; top: 20px; left: 20px; z-index: 10;">
          <mat-card 
            style="padding: 16px;"
            [ngStyle]="{
              'background': (projectState.hasActiveProject$ | async) ? '#4CAF50' : '#FF9800',
              'color': 'white'
            }">
            <h4 style="margin: 0 0 8px 0;">
              {{ (projectState.hasActiveProject$ | async) ? '🎉 Project + Editor Ready!' : '⚠️ Create Project to Start' }}
            </h4>
            <p style="margin: 0; font-size: 14px;">
              {{ (projectState.hasActiveProject$ | async) 
                ? 'EditorStateService + ProjectStateService active' 
                : 'Create a new project to enable editor' }}
            </p>
          </mat-card>
        </div>

        <!-- Canvas Controls -->
        <div style="position: absolute; top: 20px; right: 20px; z-index: 10;">
          <mat-card style="padding: 12px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <button mat-icon-button (click)="toggleCanvasMode()" [title]="'Current: ' + currentCanvasMode">
                <mat-icon>{{ currentCanvasMode === 'select' ? 'mouse' : 'pan_tool' }}</mat-icon>
              </button>
              <button 
                mat-icon-button 
                (click)="clearAllDevices()"
                [disabled]="!(projectState.hasActiveProject$ | async)">
                <mat-icon>clear</mat-icon>
              </button>
              <!-- Force Refresh Canvas Button -->
              <button 
                mat-icon-button 
                (click)="forceRefreshCanvas()"
                [disabled]="!(projectState.hasActiveProject$ | async)"
                title="Force refresh canvas">
                <mat-icon>refresh</mat-icon>
              </button>
              <!-- Auto-save Toggle -->
              <button 
                mat-icon-button 
                (click)="toggleAutoSave()"
                [color]="(projectState.autoSaveEnabled$ | async) ? 'primary' : ''">
                <mat-icon>{{ (projectState.autoSaveEnabled$ | async) ? 'sync' : 'sync_disabled' }}</mat-icon>
              </button>
            </div>
          </mat-card>
        </div>

        <!-- Canvas -->
        <div 
          #canvasContainer 
          style="width: 100%; height: 100%;"
          *ngIf="(projectState.hasActiveProject$ | async); else noProjectTemplate">
        </div>
        
        <!-- No Project Template -->
        <ng-template #noProjectTemplate>
          <div style="height: 100%; display: flex; align-items: center; justify-content: center;">
            <mat-card style="padding: 32px; text-align: center; max-width: 400px;">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: var(--primary-color);">
                    folder_open
                  </mat-icon>
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <h2>No Active Project</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">
                  Create a new project or load an existing one to start designing your network diagram.
                </p>
                <button mat-raised-button color="primary" (click)="createNewProject()">
                  <mat-icon>add</mat-icon>
                  Create New Project
                </button>
              </mat-card-content>
            </mat-card>
          </div>
        </ng-template>
      </div>

      <!-- Right Properties Panel -->
      <div style="width: 300px; background: var(--surface-color); border-left: 1px solid var(--border-color); padding: 16px;">
        <h3 style="margin-top: 0; color: var(--text-primary);">Properties</h3>
        
        <!-- Project Info -->
        <mat-card style="margin-bottom: 16px;" *ngIf="(projectState.currentProject$ | async) as project">
          <mat-card-header>
            <mat-card-title>Project Info</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
              <div><strong>ID:</strong> {{ project.id.substring(0, 8) }}...</div>
              <div><strong>Title:</strong> {{ project.metadata.title }}</div>
              <div><strong>Author:</strong> {{ project.metadata.author || 'Unknown' }}</div>
              <div><strong>Version:</strong> {{ project.metadata.version }}</div>
              <div><strong>Created:</strong> {{ project.createdAt | date:'short' }}</div>
              <div><strong>Updated:</strong> {{ project.updatedAt | date:'short' }}</div>
              <div><strong>Grid Size:</strong> {{ project.settings.gridSize }}px</div>
              <div><strong>Snap to Grid:</strong> {{ project.settings.snapToGrid ? '✅' : '❌' }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Canvas Stats -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Canvas Stats</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
              <div>Grid Size: {{ gridSize }}px</div>
              <div>Snap Distance: {{ snapDistance }}px</div>
              <div>Max Devices: {{ appLimits.MAX_DEVICES }}</div>
              <div>Zoom: {{ (editorState.zoomPercentage$ | async) }}%</div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Selected Device Info -->
        <mat-card style="margin-top: 16px;" *ngIf="selectedDevice">
          <mat-card-header>
            <mat-card-title>Selected Device</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
              <div><strong>Type:</strong> {{ selectedDevice.type }}</div>
              <div><strong>Name:</strong> {{ selectedDevice.metadata.name }}</div>
              <div><strong>Position:</strong> ({{ selectedDevice.position.x }}, {{ selectedDevice.position.y }})</div>
              <div><strong>Created:</strong> {{ selectedDevice.createdAt | date:'short' }}</div>
              <button 
                mat-stroked-button 
                color="warn" 
                (click)="deleteSelectedDevice()" 
                style="margin-top: 8px;"
                [disabled]="!selectedDevice">
                Delete Device
              </button>
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

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .template-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }
    
    .template-card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `]
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;

  // Inject ProjectStateService and ChangeDetectorRef
  readonly projectState = inject(ProjectStateService);
  readonly editorState = inject(EditorStateService);
  readonly undoRedoService = inject(UndoRedoService);
  readonly deviceLibrary = inject(DeviceLibraryService);
  readonly connectionService = inject(ConnectionService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Expose imports for template
  readonly DeviceType = DeviceType;
  readonly DEVICE_CONFIG = DEVICE_CONFIG;

  // App configuration from constants
  readonly appName = APP_CONFIG.APP_NAME;
  readonly appLimits = APP_CONFIG.LIMITS;
  readonly gridSize = CANVAS_CONFIG.GRID.SIZE;
  readonly snapDistance = CANVAS_CONFIG.SNAP.DISTANCE;

  // Canvas state
  currentCanvasMode: CanvasMode = CanvasMode.SELECT;

  // Konva objects
  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private selectedShape: Konva.Shape | Konva.Group | null = null;

  // Component state
  selectedDevice: Device | null = null;

  // Manual subscription management
  private destroy$ = new Subject<void>();

  // Connection state properties
  selectedConnections: any[] = [];
  currentDrawingState: any = null;

  constructor() {
    // Device count logging (keep this for debugging)
    this.projectState.deviceCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log(`🎯 Device count updated: ${count}`);
      });

    // NEW: Editor state logging for debugging
    this.editorState.isInitialized$
      .pipe(takeUntil(this.destroy$))
      .subscribe(initialized => {
        console.log(`🎯 Editor initialized: ${initialized}`);
      });

    this.editorState.zoomPercentage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(zoom => {
        console.log(`🔍 Editor zoom: ${zoom}%`);
      });

    // NEW: Undo/Redo state logging for debugging
    this.undoRedoService.canUndo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canUndo => {
        console.log(`↩️ Can undo: ${canUndo}`);
      });

    this.undoRedoService.canRedo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canRedo => {
        console.log(`↪️ Can redo: ${canRedo}`);
      });

    this.undoRedoService.historySize$
      .pipe(takeUntil(this.destroy$))
      .subscribe(size => {
        console.log(`📚 History size: ${size}`);
      });

    // NEW: Device Library state logging for debugging
    this.deviceLibrary.templateCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log(`📚 Device templates loaded: ${count}`);
      });

    this.deviceLibrary.searchResults$
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        console.log(`🔍 Search results: ${results.length} templates`);
      });

    this.deviceLibrary.favoriteTemplates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(favorites => {
        console.log(`⭐ Favorite templates: ${favorites.length}`);
      });

    // NEW: Connection Service state logging for debugging
    this.connectionService.connectionCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log(`🔗 Connections count: ${count}`);
      });

    this.connectionService.isEnabled$
      .pipe(takeUntil(this.destroy$))
      .subscribe(enabled => {
        console.log(`🔗 Connection service: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      });

    this.connectionService.isDrawing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isDrawing => {
        console.log(`✏️ Connection drawing: ${isDrawing ? 'ACTIVE' : 'INACTIVE'}`);
      });

    this.connectionService.selectedConnectionCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log(`🎯 Selected connections: ${count}`);
      });

    // NEW: Connection drawing preview updates
    this.connectionService.selectedConnections$
      .pipe(takeUntil(this.destroy$))
      .subscribe(selectedConnections => {
        this.selectedConnections = selectedConnections;
        console.log(`🎯 Selected connections updated: ${selectedConnections.length}`);
      });

    this.connectionService.drawingState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(drawingState => {
        this.currentDrawingState = drawingState;

        if (drawingState.isDrawing) {
          this.renderConnectionPreview();
        } else {
          // Clear preview when not drawing
          if (this.layer) {
            const existingPreview = this.layer.find('.connection-preview');
            existingPreview.forEach(node => node.destroy());
            this.layer.batchDraw();
          }
        }
      });
  }

  ngAfterViewInit(): void {
    // Canvas will be initialized when project is loaded
    this.projectState.hasActiveProject$
      .pipe(takeUntil(this.destroy$))
      .subscribe(hasProject => {
        if (hasProject && this.canvasContainer) {
          setTimeout(() => this.initializeCanvas(), 0);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.keyboardHandlers) {
      window.removeEventListener('keydown', this.keyboardHandlers.handleKeyDown);
      window.removeEventListener('keyup', this.keyboardHandlers.handleKeyUp);
    }

    if (this.stage) {
      this.stage.destroy();
    }
  }

  // === NEW: EDITOR STATE METHODS ===

  /**
   * Set editor mode (SELECT, PAN, CONNECT, ANNOTATE)
   */
  setEditorMode(mode: 'select' | 'pan' | 'connect' | 'annotate'): void {
    const canvasMode = mode as CanvasMode;
    const result = this.editorState.setMode(canvasMode);
    if (result.success) {
      this.currentCanvasMode = canvasMode;
      console.log(`🔧 Mode set to: ${mode}`);
    } else {
      console.error('❌ Failed to set mode:', result.error);
    }
  }

  /**
   * Zoom in using EditorStateService
   */
  zoomIn(): void {
    const viewport = this.editorState.getCurrentState().viewport;
    const centerPoint: Point = { x: viewport.centerX, y: viewport.centerY };
    const result = this.editorState.zoomIn(centerPoint);

    if (result.success && this.stage) {
      const editorState = this.editorState.getCurrentState();
      this.stage.scale({ x: editorState.zoom.level, y: editorState.zoom.level });
      this.stage.position({ x: editorState.pan.position.x, y: editorState.pan.position.y });
      this.layer.batchDraw();
      console.log(`🔍 Zoomed in to: ${Math.round(editorState.zoom.level * 100)}%`);
    }
  }

  /**
   * Zoom out using EditorStateService
   */
  zoomOut(): void {
    const viewport = this.editorState.getCurrentState().viewport;
    const centerPoint: Point = { x: viewport.centerX, y: viewport.centerY };
    const result = this.editorState.zoomOut(centerPoint);

    if (result.success && this.stage) {
      const editorState = this.editorState.getCurrentState();
      this.stage.scale({ x: editorState.zoom.level, y: editorState.zoom.level });
      this.stage.position({ x: editorState.pan.position.x, y: editorState.pan.position.y });
      this.layer.batchDraw();
      console.log(`🔍 Zoomed out to: ${Math.round(editorState.zoom.level * 100)}%`);
    }
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    const result = this.editorState.resetZoom();

    if (result.success && this.stage) {
      // Apply zoom to Konva stage
      this.stage.scale({ x: 1, y: 1 });
      this.stage.position({ x: 0, y: 0 });
      this.layer.batchDraw();
      console.log(`🔍 Zoom reset to 100%`);
    }
  }

  /**
   * Fit canvas content to screen
   */
  fitToScreen(): void {
    const result = this.editorState.fitToScreen();

    if (result.success && this.stage) {
      // Apply zoom to Konva stage
      const editorState = this.editorState.getCurrentState();
      this.stage.scale({ x: editorState.zoom.level, y: editorState.zoom.level });
      this.layer.batchDraw();
      console.log(`📏 Fit to screen: ${Math.round(editorState.zoom.level * 100)}%`);
    }
  }

  /**
   * Center canvas viewport
   */
  centerCanvas(): void {
    const viewport = this.editorState.getCurrentState().viewport;
    const centerPoint: Point = { x: viewport.centerX, y: viewport.centerY };
    const result = this.editorState.centerOn(centerPoint);

    if (result.success && this.stage) {
      // Apply pan to Konva stage
      const panState = this.editorState.getCurrentState().pan;
      this.stage.position({ x: panState.position.x, y: panState.position.y });
      this.layer.batchDraw();
      console.log(`🎯 Canvas centered`);
    }
  }

  // === NEW: UNDO/REDO METHODS ===

  /**
   * Undo last action
   */
  async undoLastAction(): Promise<void> {
    console.log('↩️ AppComponent: Undoing last action...');
    const result = await this.undoRedoService.undo();

    if (result.success) {
      console.log('✅ AppComponent: Undo successful');
      // Force canvas refresh to reflect changes
      this.forceRefreshCanvas();
    } else {
      console.error('❌ AppComponent: Undo failed:', result.error);
    }
  }

  /**
   * Redo last undone action
   */
  async redoLastAction(): Promise<void> {
    console.log('↪️ AppComponent: Redoing last action...');
    const result = await this.undoRedoService.redo();

    if (result.success) {
      console.log('✅ AppComponent: Redo successful');
      // Force canvas refresh to reflect changes
      this.forceRefreshCanvas();
    } else {
      console.error('❌ AppComponent: Redo failed:', result.error);
    }
  }

  /**
   * Clear undo/redo history
   */
  clearUndoHistory(): void {
    this.undoRedoService.clearHistory();
    console.log('🧹 AppComponent: Undo history cleared');
  }

  /**
   * Toggle undo/redo recording
   */
  toggleUndoRecording(): void {
    const currentState = this.undoRedoService.getHistoryState().isRecording;
    this.undoRedoService.setRecording(!currentState);
    console.log(`🎬 AppComponent: Undo recording ${!currentState ? 'enabled' : 'disabled'}`);
  }

  // === NEW: ENHANCED PAN SUPPORT ===

  /**
   * Enhanced pan with undo/redo support
   */
  panCanvasTo(position: Point, withHistory: boolean = true): void {
    if (withHistory) {
      // ➕ ОПРОСТЕНО: Само 3 параметъра
      const result = this.editorState.setPanWithHistory(
        position,
        `Pan canvas to (${Math.round(position.x)}, ${Math.round(position.y)})`,
        this.undoRedoService
      );

      if (result.success) {
        console.log(`🖐️ Canvas panned with history to:`, position);
        // Auto-sync ще обнови Konva stage-а автоматично
      }
    } else {
      const result = this.editorState.setPan(position);
      if (result.success) {
        console.log(`🖐️ Canvas panned without history to:`, position);
        // Auto-sync ще обнови Konva stage-а автоматично
      }
    }
  }
  /**
   * Animate pan to center
   */
  async animatePanToCenter(): Promise<void> {
    const viewport = this.editorState.getCurrentState().viewport;
    const centerPosition: Point = {
      x: viewport.width / 2 - 400, // Assuming content center around (400, 300)
      y: viewport.height / 2 - 300
    };

    console.log('🎬 Starting pan animation to center...');

    // ➕ ОПРОСТЕНА ВЕРСИЯ: Auto-sync ще се погрижи за Konva updates
    const result = await this.editorState.animatePanTo(
      centerPosition,
      500,
      'easeInOut',
      this.stage,  // Animacията все още се нуждае от stage/layer за smooth updates
      this.layer
    );

    if (result.success) {
      // ➕ ОПРОСТЕНО: Само 3 параметъра - auto-sync ще обнови Konva stage-а
      this.editorState.setPanWithHistory(
        centerPosition,
        'Animate pan to center',
        this.undoRedoService
      );

      console.log('✅ Pan animation completed with undo/redo support');
    }
  }

  /**
   * Reset pan position with undo/redo
   */
  resetPanPosition(): void {
    const resetPosition: Point = { x: 0, y: 0 };
    this.panCanvasTo(resetPosition, true);
  }

  /**
   * Set pan constraints based on canvas content
   */
  updatePanConstraints(): void {
    const viewport = this.editorState.getCurrentState().viewport;
    const project = this.projectState.getCurrentProject();

    if (!project || project.devices.length === 0) {
      this.editorState.clearPanConstraints();
      return;
    }

    // Calculate content bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    project.devices.forEach(device => {
      minX = Math.min(minX, device.position.x - device.size.width / 2);
      maxX = Math.max(maxX, device.position.x + device.size.width / 2);
      minY = Math.min(minY, device.position.y - device.size.height / 2);
      maxY = Math.max(maxY, device.position.y + device.size.height / 2);
    });

    // Add padding
    const padding = 200;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Set constraints to keep content visible
    const constraints = {
      minX: viewport.width - maxX,
      maxX: -minX,
      minY: viewport.height - maxY,
      maxY: -minY
    };

    this.editorState.setPanConstraints(constraints);
    console.log('🔒 Pan constraints updated based on content bounds');
  }

  // === PROJECT ACTIONS ===

  createNewProject(): void {
    const project = this.projectState.createNewProject({
      title: `Network Diagram ${new Date().toLocaleDateString()}`,
      author: 'Network Editor User',
      description: 'Created with ProjectStateService + EditorStateService',
    });

    console.log('✅ New project created:', project.id);
  }

  closeProject(): void {
    this.projectState.closeProject();
    this.clearCanvas();
    console.log('📁 Project closed');
  }

  exportProject(): void {
    const project = this.projectState.getCurrentProject();
    if (!project) return;

    const projectData = JSON.stringify(project, null, 2);
    const filename = `${project.metadata.title}${FileUtils.getTimestampSuffix()}${APP_CONFIG.FILE_EXTENSIONS.PROJECT}`;

    FileUtils.downloadFile(projectData, filename);
    this.projectState.markAsSaved();
    console.log('💾 Project exported:', filename);
  }

  toggleAutoSave(): void {
    const currentState = this.projectState['_autoSaveEnabled$'].value;
    this.projectState.setAutoSave(!currentState);
    console.log(`🔄 Auto-save ${!currentState ? 'enabled' : 'disabled'}`);
  }

  // === DEVICE ACTIONS - METHODS ===

  addDevice(): void {
    this.addTypedDevice(DeviceType.ROUTER);
  }

  addTypedDevice(type: DeviceType): void {
    const project = this.projectState.getCurrentProject();
    if (!project) return;

    try {
      // ➕ НОВА ЛОГИКА: Използвай DeviceLibraryService
      console.log(`🏭 Creating device from template: ${type}`);

      // Намери template за този device type
      const templates = this.deviceLibrary.getTemplates();
      const template = templates.find(t => t.deviceType === type);

      if (!template) {
        console.error(`❌ No template found for device type: ${type}`);
        return;
      }

      console.log(`📋 Using template: ${template.name} (ID: ${template.id})`);

      // Генерирай random позиция
      const position: Point = {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      };

      // Създай device от template
      const result = this.deviceLibrary.createDeviceFromTemplate(
        template.id,
        position,
        {
          // Customizations (ако са нужни)
          position: project.settings.snapToGrid
            ? MathUtils.snapToGrid(position, project.settings.gridSize)
            : position
        }
      );

      if (result.success && result.device) {
        // Добави device към project чрез Command Pattern
        const command = this.undoRedoService.createAddDeviceCommand(result.device, this.projectState);
        this.undoRedoService.executeCommand(command);

        console.log(`✅ Device created from template: ${result.device.metadata.name}`);
        console.log(`📊 Template usage updated:`, result.template?.usage);
      } else {
        console.error('❌ Failed to create device from template:', result.error);
      }

    } catch (error) {
      console.error('❌ Error creating device from template:', error);
    }
  }

  deleteSelectedDevice(): void {
    if (!this.selectedDevice) return;

    const deviceName = this.selectedDevice.metadata.name;
    const deviceId = this.selectedDevice.id;
    const deviceToDelete = { ...this.selectedDevice }; // Create copy for command

    try {
      // ➕ НОВА ЛОГИКА: Използвай Command Pattern
      const command = this.undoRedoService.createRemoveDeviceCommand(
        deviceId,
        deviceToDelete,
        this.projectState
      );

      // Clear selection FIRST before executing command
      this.clearSelectionSafe();

      // Execute command
      this.undoRedoService.executeCommand(command);

      console.log(`✅ Device deleted via command: ${deviceName}`);
    } catch (error) {
      console.error('❌ Error deleting device via command:', error);
    }
  }

  clearAllDevices(): void {
    const project = this.projectState.getCurrentProject();
    if (!project || project.devices.length === 0) return;

    try {
      // ➕ ОПРОСТЕНА ЛОГИКА: Създай batch команда директно
      const devicesToRemove = [...project.devices]; // Копие на всички devices

      console.log(`🔄 Creating batch command to clear ${devicesToRemove.length} devices`);

      // Създай отделни команди за всяко устройство
      const removeCommands = devicesToRemove.map(device =>
        this.undoRedoService.createRemoveDeviceCommand(
          device.id,
          device,
          this.projectState
        )
      );

      // Създай batch команда с всички remove команди
      const batchCommand = this.createBatchRemoveCommand(
        removeCommands,
        `Clear all devices (${devicesToRemove.length} items)`
      );

      // Изпълни batch командата
      this.undoRedoService.executeCommand(batchCommand);

      console.log(`✅ Batch command executed - all devices cleared`);
    } catch (error) {
      console.error('❌ Error clearing devices via batch command:', error);
    }
  }

  // === NEW: DEVICE LIBRARY METHODS ===

  // === NEW: FILTER STATE ===

  /** Current search query */
  searchQuery: string = '';

  /** Show favorites only filter */
  showFavoritesOnly: boolean = false;

  /** Show recent only filter */
  showRecentOnly: boolean = false;

  /** Selected device category filter */
  selectedCategory: string | null = null;

  // === ENHANCED: DEVICE LIBRARY METHODS ===

  /**
   * Handle search query changes
   */
  onSearchQueryChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;

    // Trigger debounced search via DeviceLibraryService
    this.deviceLibrary.quickSearch(this.searchQuery);

    console.log(`🔍 Search query updated: "${this.searchQuery}"`);
  }

  /**
   * Toggle favorites only filter
   */
  toggleFavoritesFilter(): void {
    this.showFavoritesOnly = !this.showFavoritesOnly;

    // If turning on favorites, turn off recent
    if (this.showFavoritesOnly) {
      this.showRecentOnly = false;
    }

    this.deviceLibrary.updateFilter({
      showFavoritesOnly: this.showFavoritesOnly,
      showRecentOnly: this.showRecentOnly
    });

    console.log(`⭐ Favorites filter: ${this.showFavoritesOnly ? 'ON' : 'OFF'}`);
  }

  /**
   * Toggle recent only filter
   */
  toggleRecentFilter(): void {
    this.showRecentOnly = !this.showRecentOnly;

    // If turning on recent, turn off favorites
    if (this.showRecentOnly) {
      this.showFavoritesOnly = false;
    }

    this.deviceLibrary.updateFilter({
      showFavoritesOnly: this.showFavoritesOnly,
      showRecentOnly: this.showRecentOnly
    });

    console.log(`🕒 Recent filter: ${this.showRecentOnly ? 'ON' : 'OFF'}`);
  }

  /**
   * Clear all filters and search
   */
  clearAllFilters(): void {
    this.searchQuery = '';
    this.showFavoritesOnly = false;
    this.showRecentOnly = false;
    this.selectedCategory = null;

    this.deviceLibrary.clearFilters();
    console.log('🧹 All filters cleared');
  }

  /**
   * Clear device search only
   */
  clearDeviceSearch(): void {
    this.searchQuery = '';
    this.deviceLibrary.quickSearch('');
    console.log('🧹 Search query cleared');
  }

  /**
   * Add template to favorites (enhanced with UI feedback)
   */
  addTemplateToFavorites(templateId: string): void {
    const success = this.deviceLibrary.addToFavorites(templateId);
    if (success) {
      console.log('⭐ Template added to favorites');
      // Could add snackbar notification here
    }
  }

  /**
   * Remove template from favorites (enhanced with UI feedback)
   */
  removeTemplateFromFavorites(templateId: string): void {
    const success = this.deviceLibrary.removeFromFavorites(templateId);
    if (success) {
      console.log('💔 Template removed from favorites');
      // Could add snackbar notification here
    }
  }

  /**
   * Get and display library analytics
   */
  getLibraryAnalytics(): void {
    const analytics = this.deviceLibrary.getAnalytics();
    console.log('📊 Device Library Analytics:');
    console.log(`  📚 Total Templates: ${analytics.totalTemplates}`);
    console.log(`  📂 By Category:`, analytics.templatesByCategory);
    console.log(`  🔥 Most Popular:`, analytics.mostPopularTemplates.map(t => t.name));
    console.log(`  🆕 Recently Added:`, analytics.recentlyAddedTemplates.map(t => t.name));
    console.log(`  📈 Category Usage:`, analytics.categoryUsage);
  }

  /**
   * Test favorites functionality
   */
  testFavorites(): void {
    console.log('🧪 Testing favorites functionality...');

    // Get first few templates
    const templates = this.deviceLibrary.getTemplates();
    const testTemplates = templates.slice(0, 3);

    testTemplates.forEach((template, index) => {
      setTimeout(() => {
        console.log(`⭐ Adding template ${index + 1} to favorites: ${template.name}`);
        this.addTemplateToFavorites(template.id);
      }, index * 500);
    });

    // Remove one after a delay
    setTimeout(() => {
      if (testTemplates.length > 0) {
        console.log(`💔 Removing template from favorites: ${testTemplates[0].name}`);
        this.removeTemplateFromFavorites(testTemplates[0].id);
      }
    }, 2000);
  }

  // === NEW: CONNECTION SERVICE METHODS ===

  /** Current connection drawing mode */
  connectionDrawingMode: string = 'straight';

  /** Connection drawing state */
  isDrawingConnection: boolean = false;

  // === OPTIONAL: Getter методи за лесен достъп ===

  /**
   * Get current connections
   */
  get currentConnections(): any[] {
    return this.projectState.getCurrentProject()?.connections || [];
  }

  /**
   * Get currently selected connections
   */
  get currentSelectedConnections(): any[] {
    return this.selectedConnections;
  }

  /**
   * Check if connection is selected
   */
  isConnectionSelected(connectionId: string): boolean {
    return this.selectedConnections.some(c => c.id === connectionId);
  }

  /**
   * Check if currently drawing connection
   */
  get isCurrentlyDrawing(): boolean {
    return this.currentDrawingState?.isDrawing || false;
  }

  /**
   * Set editor to connection mode
   */
  setConnectionMode(): void {
    console.log('🔗 AppComponent: Switching to connection mode...');

    // ✅ STEP 1: Cancel any active drawing first
    this.cleanupConnectionState();

    // ✅ STEP 2: Set mode through EditorStateService
    const result = this.editorState.setMode('connect' as any);
    if (result.success) {
      console.log('✅ EditorStateService: Connection mode set successfully');

      // ✅ STEP 3: Wait for EditorStateService to set cursor, then confirm
      setTimeout(() => {
        if (this.stage && this.stage.container()) {
          // Only set cursor if it's not already crosshair
          const currentCursor = this.stage.container().style.cursor;
          if (currentCursor !== 'crosshair') {
            this.stage.container().style.cursor = 'crosshair';
            console.log('🎯 Cursor corrected to crosshair');
          } else {
            console.log('✅ Cursor already crosshair');
          }
        }

        // ✅ STEP 4: Enable ConnectionService
        if (this.connectionService) {
          this.connectionService.enable();
          console.log('🔗 ConnectionService enabled');
        }

        // ✅ STEP 5: Update device rendering (disable dragging in connection mode)
        this.updateDeviceInteractionMode('connect');

        console.log('✅ Connection mode fully activated');
      }, 50);

    } else {
      console.error('❌ Failed to set connection mode:', result.error);
    }
  }

  /**
   * Set connection drawing mode
   */
  setConnectionDrawingMode(mode: 'straight' | 'orthogonal' | 'bezier'): void {
    this.connectionDrawingMode = mode;

    // Map to ConnectionService enum
    const drawingModeMap = {
      'straight': 'straight',
      'orthogonal': 'orthogonal',
      'bezier': 'bezier'
    };

    this.connectionService.setDrawingMode(drawingModeMap[mode] as any);
    console.log(`🎨 Connection drawing mode: ${mode}`);
  }

  /**
   * Cancel current connection drawing
   */
  cancelConnectionDrawing(): void {
    console.log('🚫 Cancelling connection drawing');

    // cancelDrawing връща void - това е OK
    this.connectionService.cancelDrawing();
    this.isDrawingConnection = false;

    // Reset cursor
    this.stage.container().style.cursor = 'default';

    console.log('✅ Connection drawing cancelled');
  }

  /**
   * Start connection drawing from device
   */
  startConnectionFromDevice(device: any, clickPoint: Point): void {
    if (!this.connectionService || !device) {
      console.error('❌ Cannot start connection - service or device not available');
      return;
    }

    console.log(`🎨 Starting connection from device: ${device.metadata.name} at (${clickPoint.x}, ${clickPoint.y})`);

    // startDrawing връща boolean - това е OK
    const success = this.connectionService.startDrawing(
      device,
      clickPoint,
      'ethernet' as any // Default connection type
    );

    if (success) {
      this.isDrawingConnection = true;
      console.log('✅ Connection drawing started successfully');
      console.log(`🎯 isDrawingConnection set to: ${this.isDrawingConnection}`);
    } else {
      console.error('❌ Failed to start connection drawing');
    }
  }

  /**
   * Update connection drawing preview
   */

  updateConnectionDrawing(currentPoint: Point, snapDevice?: any): void {
    if (!this.connectionService || !this.isDrawingConnection) {
      console.log('⚠️ Cannot update connection drawing - service not ready or not drawing');
      return;
    }

    console.log(`🎨 Updating connection drawing at (${currentPoint.x}, ${currentPoint.y})`);

    // ConnectionService.updateDrawing връща void, не boolean
    this.connectionService.updateDrawing(
      currentPoint,
      snapDevice // Optional snap target
    );

    console.log('✅ Connection drawing updated successfully');
    // Preview се render-ва автоматично чрез subscription
  }

  /**
   * Finish connection drawing
   */
  finishConnectionDrawing(endDevice: any, endPoint: Point): void {
    if (!this.isDrawingConnection || !this.connectionService) {
      console.log('⚠️ Cannot finish connection - not drawing or service not available');
      return;
    }

    console.log(`🏁 Finishing connection to device: ${endDevice.metadata.name}`);

    // ✅ Create connection via ConnectionService
    const result = this.connectionService.finishDrawing(
      endDevice,
      endPoint,
      'ethernet' as any,
      this.projectState
    );

    if (result.success && result.connection) {
      console.log('✅ Connection created successfully:', result.connection.id);

      // ✅ PERFORMANCE FIX: Add to project WITHOUT triggering excessive re-renders
      try {
        // Get current project
        const currentProject = this.projectState.getCurrentProject();
        if (currentProject) {
          // ➕ IMPORTANT: Check if connection already exists
          const existingConnection = currentProject.connections.find(c => c.id === result.connection!.id);

          if (!existingConnection) {
            this.projectState.addConnection(result.connection);
            console.log(`📁 Connection added to project: ${result.connection.id}`);
            console.log(`📊 Total connections now: ${currentProject.connections.length + 1}`);
          } else {
            console.log('⚠️ Connection already exists in project');
          }
        }
      } catch (error) {
        console.error('❌ Failed to add connection to project:', error);
      }
    } else {
      console.error('❌ Failed to create connection:', result.error);
    }

    this.isDrawingConnection = false;

    // Reset cursor properly
    if (this.stage) {
      const editorState = this.editorState.getCurrentState();
      const cursor = editorState.interaction.mode === 'connect' ? 'crosshair' : 'default';
      this.stage.container().style.cursor = cursor;
    }
  }

  /**
   * HELPER: Clean up connection drawing state completely
   */
  private cleanupConnectionState(): void {
    console.log('🧹 Cleaning up connection state...');

    // Cancel any active connection drawing
    if (this.isDrawingConnection && this.connectionService) {
      this.connectionService.cancelDrawing();
      console.log('🚫 Active connection drawing cancelled');
    }

    // Reset AppComponent connection state
    this.isDrawingConnection = false;

    // Remove any preview lines from canvas
    if (this.layer) {
      const previewLines = this.layer.find('.connection-preview');
      previewLines.forEach(line => line.destroy());
      if (previewLines.length > 0) {
        this.layer.batchDraw();
        console.log(`🗑️ Removed ${previewLines.length} preview lines`);
      }
    }

    // Reset any temporary state variables
    this.connectionDrawingMode = 'straight';

    console.log('✅ Connection state cleanup complete');
  }

  /**
   * HELPER: Update device interaction mode (dragging enabled/disabled)
   */
  private updateDeviceInteractionMode(mode: 'select' | 'connect'): void {
    if (!this.layer) return;

    const deviceGroups = this.layer.find('.device');
    console.log(`🔧 Updating ${deviceGroups.length} devices for ${mode} mode...`);

    deviceGroups.forEach((deviceGroup: any) => {
      if (deviceGroup instanceof Konva.Group) {
        const deviceId = deviceGroup.getAttr('deviceId');
        const device = this.projectState.getDevice(deviceId);

        if (device) {
          // Re-setup interaction for this device
          this.setupDeviceInteraction(deviceGroup, device, mode);
          console.log(`✅ Updated device ${device.metadata.name} for ${mode} mode (draggable: ${deviceGroup.draggable()})`);
        }
      }
    });

    // Batch draw to apply changes
    this.layer.batchDraw();
    console.log(`✅ All devices updated for ${mode} mode`);
  }

  /**
 * ENHANCED: Check current mode safely
 */
  getCurrentEditorMode(): string {
    try {
      const editorState = this.editorState.getCurrentState();
      return editorState.interaction.mode;
    } catch (error) {
      console.error('❌ Error getting current mode:', error);
      return 'select'; // Safe fallback
    }
  }

  /**
   * DIAGNOSTIC: Debug mode switching state
   */
  debugModeState(): void {
    const mode = this.getCurrentEditorMode();
    const cursor = this.stage?.container()?.style?.cursor || 'unknown';
    const isDrawing = this.isDrawingConnection;
    const serviceEnabled = this.connectionService ? 'available' : 'unavailable';

    console.log('🐛 MODE STATE DEBUG:');
    console.log(`  📋 Current Mode: ${mode}`);
    console.log(`  🎯 Current Cursor: ${cursor}`);
    console.log(`  🎨 Is Drawing: ${isDrawing}`);
    console.log(`  🔗 Connection Service: ${serviceEnabled}`);

    // Check device dragging state
    if (this.layer) {
      const devices = this.layer.find('.device');
      const draggableCount = devices.filter((d: any) => d.draggable && d.draggable()).length;
      console.log(`  🔧 Draggable Devices: ${draggableCount}/${devices.length}`);
    }

    console.log('  ✅ Mode state debug complete');
  }

  /**
   * Get connection analytics
   */
  getConnectionAnalytics(): void {
    const analytics = this.connectionService.getAnalytics();
    console.log('📊 Connection Analytics:');
    console.log(`  🔗 Total Connections: ${analytics.totalConnections}`);
    console.log(`  📂 By Type:`, analytics.connectionsByType);
    console.log(`  📏 Average Length: ${analytics.averageConnectionLength.toFixed(2)}px`);
    console.log(`  🎯 Most Connected:`, analytics.mostConnectedDevice);
    console.log(`  📈 Connection Density: ${analytics.connectionDensity.toFixed(2)}`);
    console.log(`  🔍 Topology:`, analytics.topologyAnalysis);
  }

  // === NEW: CONNECTION MOUSE HANDLING ===

  /**
   * Handle mouse down in connection mode
   */
  private handleConnectionMouseDown(e: any, pointer: Point): void {
    const target = e.target;

    if (this.isDrawingConnection) {
      // Already drawing - this might be the end point
      console.log('🎯 Connection drawing in progress - checking for end device');
      return;
    }

    // Check if clicked on a device
    const device = this.getDeviceFromTarget(target);
    if (device) {
      console.log(`🎨 Starting connection from device: ${device.metadata.name}`);
      this.startConnectionFromDevice(device, pointer);
    } else {
      console.log('⚠️ Connection mode requires clicking on a device');
    }
  }

  /**
   * Handle mouse move in connection mode
   */
  private handleConnectionMouseMove(e: any, pointer: Point): void {
    if (!this.isDrawingConnection) {
      console.log('⚠️ Not drawing connection - ignoring mouse move');
      return;
    }

    console.log(`🎨 Connection mouse move at (${pointer.x}, ${pointer.y})`);

    // Check if hovering over a device
    const target = e.target;
    const snapDevice = this.getDeviceFromTarget(target);

    // Update connection preview - няма нужда от boolean проверка
    this.updateConnectionDrawing(pointer, snapDevice);

    // Update cursor based on snap target
    if (snapDevice) {
      this.stage.container().style.cursor = 'crosshair';
      console.log(`🎯 Hovering over device: ${snapDevice.metadata.name}`);
    } else {
      this.stage.container().style.cursor = 'not-allowed';
      console.log('⚠️ Not hovering over valid device');
    }
  }

  /**
   * Handle mouse up in connection mode
   */
  private handleConnectionMouseUp(e: any, pointer: Point): void {
    if (!this.isDrawingConnection) return;

    const target = e.target;
    const endDevice = this.getDeviceFromTarget(target);

    if (endDevice) {
      console.log(`🏁 Ending connection at device: ${endDevice.metadata.name}`);
      this.finishConnectionDrawing(endDevice, pointer);
    } else {
      console.log('❌ Connection must end on a device - cancelling');
      this.cancelConnectionDrawing();
    }

    // Reset cursor
    this.stage.container().style.cursor = 'default';
  }

  /**
   * Get device from Konva target
   */
  private getDeviceFromTarget(target: any): any {
    if (!target) {
      console.log('⚠️ getDeviceFromTarget: No target provided');
      return null;
    }

    console.log(`🔍 Looking for device from target: ${target.getClassName()}`);

    // ✅ ENHANCED: Multiple ways to find device ID
    let deviceId = target.getAttr('deviceId');
    console.log(`🔍 Direct deviceId: ${deviceId}`);

    if (!deviceId && target.getParent) {
      const parent = target.getParent();
      if (parent) {
        deviceId = parent.getAttr('deviceId');
        console.log(`🔍 Parent deviceId: ${deviceId}`);
      }
    }

    if (!deviceId && target.findAncestor) {
      const deviceGroup = target.findAncestor('.device');
      if (deviceGroup) {
        deviceId = deviceGroup.getAttr('deviceId');
        console.log(`🔍 Ancestor deviceId: ${deviceId}`);
      }
    }

    if (deviceId) {
      const device = this.projectState.getDevice(deviceId);
      if (device) {
        console.log(`✅ Found device: ${device.metadata.name} (ID: ${deviceId})`);
        return device;
      } else {
        console.log(`❌ Device ID ${deviceId} not found in project`);
      }
    }

    console.log('❌ No device found for target');
    return null;
  }
  // === NEW: CONNECTION RENDERING ===

  /**
   * Render all connections on canvas
   */
  private renderConnections(connections: any[]): void {
    if (!this.layer) {
      console.warn('⚠️ Cannot render connections - layer not available');
      return;
    }

    console.log(`🎨 Rendering ${connections.length} connections on canvas`);

    // ✅ FIXED: Get current connections on canvas for comparison
    const existingConnectionIds = new Set<string>();
    const existingConnections = this.layer.find('.connection');

    existingConnections.forEach((node: any) => {
      const connectionId = node.getAttr('connectionId');
      if (connectionId) {
        existingConnectionIds.add(connectionId);
      }
    });

    console.log(`📊 Found ${existingConnectionIds.size} existing connections on canvas`);

    // ✅ IMPROVED: Only remove connections that no longer exist in project
    const currentConnectionIds = new Set(connections.map(c => c.id));

    existingConnections.forEach((node: any) => {
      const connectionId = node.getAttr('connectionId');
      if (connectionId && !currentConnectionIds.has(connectionId)) {
        console.log(`🗑️ Removing obsolete connection: ${connectionId}`);
        node.destroy();
      }
    });

    // ✅ IMPROVED: Render new or updated connections
    let renderedCount = 0;
    let skippedCount = 0;

    connections.forEach(connection => {
      if (existingConnectionIds.has(connection.id)) {
        // Connection already exists - could check if update needed
        console.log(`⏭️ Skipping existing connection: ${connection.id}`);
        skippedCount++;
      } else {
        // New connection - render it
        this.renderSingleConnection(connection);
        renderedCount++;
      }
    });

    // Batch draw for performance
    this.layer.batchDraw();

    console.log(`✅ Connections rendering complete:`);
    console.log(`   📊 Total requested: ${connections.length}`);
    console.log(`   ✅ Newly rendered: ${renderedCount}`);
    console.log(`   ⏭️ Already existed: ${skippedCount}`);
    console.log(`   🎨 Final canvas connections: ${this.layer.find('.connection').length}`);
  }

  /**
   * HELPER: Force re-render all connections (useful for troubleshooting)
   */
  private forceRerenderAllConnections(connections: any[]): void {
    if (!this.layer) return;

    console.log('🔄 FORCE: Re-rendering all connections from scratch');

    // Remove ALL connection-related nodes
    const allConnectionNodes = this.layer.find((node: any) => {
      const name = node.name();
      return name === 'connection' ||
        name === 'connection-arrow' ||
        name === 'connection-label' ||
        name === 'connection-label-bg';
    });

    allConnectionNodes.forEach(node => node.destroy());

    // Render each connection fresh
    connections.forEach(connection => {
      this.renderSingleConnection(connection);
    });

    this.layer.batchDraw();

    console.log(`🔄 FORCE: All ${connections.length} connections re-rendered`);
  }

  /**
   * Render single connection as line
   */
  private renderSingleConnection(connection: any): void {
    if (!this.layer || !connection.points || connection.points.length < 2) {
      console.warn('⚠️ Cannot render connection - missing layer, points, or insufficient points');
      return;
    }

    console.log(`🎨 Rendering connection: ${connection.id}, style:`, connection.visualStyle);

    // Flatten points array for Konva
    const points: number[] = [];
    connection.points.forEach((point: Point) => {
      points.push(point.x, point.y);
    });

    // ✅ FIXED: Improved connection styling logic
    const visualStyle = connection.visualStyle || {};

    // Default to solid line unless explicitly set to dashed
    const strokeStyle = visualStyle.style || 'solid';
    const isDashed = strokeStyle === 'dashed' || strokeStyle === 'dotted';

    // Default colors and styling
    const strokeColor = visualStyle.stroke || '#4CAF50'; // Green default
    const strokeWidth = visualStyle.strokeWidth || 3;
    const opacity = visualStyle.opacity || 1;

    console.log(`🎨 Connection ${connection.id} - isDashed: ${isDashed}, strokeStyle: ${strokeStyle}, color: ${strokeColor}`);

    // ✅ FIXED: Check for existing connection and remove only that specific one
    const existingConnection = this.layer.findOne(`#${connection.id}`);
    if (existingConnection) {
      console.log(`🔄 Removing existing connection: ${connection.id}`);
      existingConnection.destroy();
    }

    // Create new connection line
    const line = new Konva.Line({
      points: points,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
      dash: isDashed ? [8, 4] : [], // ✅ FIXED: Empty array for solid lines
      opacity: opacity,
      name: 'connection',
      id: connection.id,
      connectionId: connection.id,
      // ✅ NEW: Add metadata for easier debugging
      connectionType: connection.type,
      sourceDeviceId: connection.sourceDeviceId,
      targetDeviceId: connection.targetDeviceId
    });

    // ✅ ENHANCED: Better interaction handling
    line.on('click', (e) => {
      console.log(`🎯 Connection clicked: ${connection.id}`);
      e.cancelBubble = true; // Prevent event bubbling
      this.selectConnection(connection);
    });

    line.on('mouseenter', () => {
      // Hover effect
      line.stroke('#FFC107'); // Orange hover color
      line.strokeWidth(strokeWidth + 1);
      this.stage.container().style.cursor = 'pointer';
      this.layer.batchDraw();
      console.log(`👆 Hovering over connection: ${connection.id}`);
    });

    line.on('mouseleave', () => {
      // Reset to original or selected color
      const isSelected = this.selectedConnections.some((c: any) => c.id === connection.id);
      const finalColor = isSelected ? '#2196F3' : strokeColor; // Blue for selected, original for normal
      const finalWidth = isSelected ? strokeWidth + 1 : strokeWidth;

      line.stroke(finalColor);
      line.strokeWidth(finalWidth);

      // Reset cursor based on current editor mode
      const editorState = this.editorState.getCurrentState();
      const cursor = editorState.interaction.mode === 'connect' ? 'crosshair' : 'default';
      this.stage.container().style.cursor = cursor;

      this.layer.batchDraw();
    });

    // Add to layer
    this.layer.add(line);

    // ✅ OPTIONAL: Add arrows if specified
    if (visualStyle.showArrows) {
      this.addConnectionArrows(connection, line);
    }

    // ✅ OPTIONAL: Add label if specified
    if (visualStyle.showLabel && connection.metadata?.name) {
      this.addConnectionLabel(connection, points);
    }

    console.log(`✅ Connection rendered successfully: ${connection.id} (solid: ${!isDashed})`);
  }

  /**
   * Add arrows to connection line
   */
  private addConnectionArrows(connection: any, line: any): void {
    if (connection.points.length < 2) return;

    const lastPoint = connection.points[connection.points.length - 1];
    const secondLastPoint = connection.points[connection.points.length - 2];

    // Calculate arrow direction
    const dx = lastPoint.x - secondLastPoint.x;
    const dy = lastPoint.y - secondLastPoint.y;
    const angle = Math.atan2(dy, dx);

    // Arrow size
    const arrowSize = 12;

    // Create arrow shape
    const arrow = new Konva.Line({
      points: [
        lastPoint.x - arrowSize * Math.cos(angle - 0.5),
        lastPoint.y - arrowSize * Math.sin(angle - 0.5),
        lastPoint.x,
        lastPoint.y,
        lastPoint.x - arrowSize * Math.cos(angle + 0.5),
        lastPoint.y - arrowSize * Math.sin(angle + 0.5)
      ],
      stroke: connection.visualStyle?.stroke || '#4CAF50',
      strokeWidth: connection.visualStyle?.strokeWidth || 3,
      lineCap: 'round',
      lineJoin: 'round',
      name: 'connection-arrow',
      connectionId: connection.id
    });

    this.layer.add(arrow);
  }

  /**
   * Add label to connection
   */
  private addConnectionLabel(connection: any, points: number[]): void {
    if (points.length < 4) return;

    // Find midpoint
    const midIndex = Math.floor(points.length / 4) * 2; // Ensure even index
    const x = points[midIndex];
    const y = points[midIndex + 1];

    const label = new Konva.Text({
      x: x - 20,
      y: y - 10,
      text: connection.metadata.name,
      fontSize: 10,
      fontFamily: 'Arial',
      fill: '#333',
      align: 'center',
      name: 'connection-label',
      connectionId: connection.id
    });

    // Add background
    const background = new Konva.Rect({
      x: x - 25,
      y: y - 12,
      width: 50,
      height: 16,
      fill: '#FFFFFF',
      stroke: '#DDD',
      strokeWidth: 1,
      cornerRadius: 2,
      name: 'connection-label-bg',
      connectionId: connection.id
    });

    this.layer.add(background);
    this.layer.add(label);
  }

  /**
   * Render connection drawing preview
   */
  private renderConnectionPreview(): void {
    // FIXED: Use component property instead of .value
    if (!this.currentDrawingState?.isDrawing || !this.currentDrawingState.previewPoints || !this.layer) return;

    // Remove existing preview
    const existingPreview = this.layer.find('.connection-preview');
    existingPreview.forEach(node => node.destroy());

    if (this.currentDrawingState.previewPoints.length < 2) return;

    // Flatten points for Konva
    const points: number[] = [];
    this.currentDrawingState.previewPoints.forEach((point: Point) => {
      points.push(point.x, point.y);
    });

    // Create preview line
    const previewLine = new Konva.Line({
      points: points,
      stroke: '#9E9E9E',
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
      dash: [5, 5],
      opacity: 0.7,
      name: 'connection-preview'
    });

    this.layer.add(previewLine);
    this.layer.batchDraw();
  }

  /**
   * Select connection visually
   */
  private selectConnection(connection: any): void {
    console.log(`🎯 Connection selected: ${connection.id}`);

    // ➕ ENHANCED: Clear device selection when selecting connection
    if (this.selectedDevice) {
      this.clearSelectionSafe();
    }

    // Update ConnectionService selection
    this.connectionService.selectConnection(connection.id);

    // ➕ ENHANCED: Visual feedback for selected connection
    const connectionLines = this.layer.find(`#${connection.id}`);
    connectionLines.forEach((line: any) => {
      this.setStroke(line, '#2196F3'); // Selection color
      this.setStrokeWidth(line, (connection.visualStyle?.strokeWidth || 3) + 1);
    });

    this.layer.batchDraw();

    console.log('✅ Connection selected with visual feedback');
  }

  // === NEW: TEMPLATE INTERACTION METHODS ===

  /**
   * Track template for ngFor performance
   */
  trackTemplate(index: number, template: any): string {
    return template.id;
  }

  /**
   * Handle template hover states
   */
  onTemplateHover(template: any, isHovering: boolean): void {
    // Could add hover effects or preview functionality here
    if (isHovering) {
      console.log(`👆 Hovering template: ${template.name}`);
    }
  }

  /**
   * Handle template click (show details or quick add)
   */
  onTemplateClick(template: any): void {
    console.log(`🖱️ Template clicked: ${template.name}`);
    // Could show detailed template modal or quick actions
    this.showTemplateDetails(template, null);
  }

  /**
   * Toggle template favorite status
   */
  toggleTemplateFavorite(template: any, event: Event): void {
    // Prevent event bubbling to parent click handler
    event.stopPropagation();

    if (template.usage.isFavorite) {
      this.removeTemplateFromFavorites(template.id);
      console.log(`💔 Removed from favorites: ${template.name}`);
    } else {
      this.addTemplateToFavorites(template.id);
      console.log(`⭐ Added to favorites: ${template.name}`);
    }
  }

  /**
   * Create device from template with UI feedback
   */
  createDeviceFromTemplate(template: any, event: Event): void {
    // Prevent event bubbling
    event.stopPropagation();

    console.log(`🏭 Creating device from template: ${template.name}`);

    const project = this.projectState.getCurrentProject();
    if (!project) {
      console.warn('⚠️ No active project');
      return;
    }

    // Generate random position
    const position: Point = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100
    };

    // Create device from template
    const result = this.deviceLibrary.createDeviceFromTemplate(
      template.id,
      position,
      {
        position: project.settings.snapToGrid
          ? MathUtils.snapToGrid(position, project.settings.gridSize)
          : position
      }
    );

    if (result.success && result.device) {
      // Add device to project via Command Pattern
      const command = this.undoRedoService.createAddDeviceCommand(result.device, this.projectState);
      this.undoRedoService.executeCommand(command);

      console.log(`✅ Device created from template UI: ${result.device.metadata.name}`);
    } else {
      console.error('❌ Failed to create device from template UI:', result.error);
    }
  }

  /**
   * Show template details (placeholder for future modal)
   */
  showTemplateDetails(template: any, event: Event | null): void {
    if (event) {
      event.stopPropagation();
    }

    console.log(`ℹ️ Template Details for: ${template.name}`);
    console.log('📋 Template Data:', {
      id: template.id,
      category: template.category,
      deviceType: template.deviceType,
      defaultSize: template.defaultSize,
      tags: template.metadata.tags,
      usage: template.usage,
      createdAt: template.createdAt
    });

    // Future: Open template details modal
    // this.openTemplateModal(template);
  }

  /**
   * Demo: Load different template sets
   */
  loadMoreTemplates(): void {
    console.log('📦 Loading more templates...');
    // Future: Load additional template packs or user-created templates
  }

  /**
   * Demo: Show template creation workflow
   */
  showCreateCustomTemplate(): void {
    console.log('🎨 Opening custom template creator...');
    // Future: Open custom template creation wizard
  }

  /**
   * Create batch remove command helper method
   */
  private createBatchRemoveCommand(commands: any[], description: string): any {
    return {
      id: IdUtils.generateUUID(),
      type: 'batch_operation',
      description,
      timestamp: new Date(),

      canExecute: () => true,

      execute: () => {
        console.log(`📦 Executing batch: ${commands.length} remove commands`);
        commands.forEach((cmd, index) => {
          console.log(`  🗑️ Removing device ${index + 1}/${commands.length}`);
          cmd.execute();
        });
        return { success: true, message: 'Batch executed' };
      },

      undo: () => {
        console.log(`↩️ Undoing batch: ${commands.length} remove commands (reverse order)`);
        // Undo в обратен ред
        for (let i = commands.length - 1; i >= 0; i--) {
          console.log(`  ↩️ Restoring device ${commands.length - i}/${commands.length}`);
          commands[i].undo();
        }
        return { success: true, message: 'Batch undone' };
      },

      redo: () => {
        console.log(`↪️ Redoing batch: ${commands.length} remove commands`);
        commands.forEach((cmd, index) => {
          console.log(`  🗑️ Re-removing device ${index + 1}/${commands.length}`);
          cmd.redo();
        });
        return { success: true, message: 'Batch redone' };
      }
    };
  }

  // === TEST: MANUAL BATCHING ===

  testManualBatching(): void {
    console.log('🧪 Testing manual batching...');

    this.undoRedoService.startBatch('Manual batch test');

    // Добави няколко devices с delay
    setTimeout(() => {
      this.addTypedDevice(DeviceType.ROUTER);
    }, 500);

    setTimeout(() => {
      this.addTypedDevice(DeviceType.SWITCH);
    }, 1000);

    setTimeout(() => {
      this.addTypedDevice(DeviceType.SERVER);
      this.undoRedoService.endBatch();
      console.log('🧪 Manual batch completed');
    }, 1500);
  }

  forceRefreshCanvas(): void {
    console.log('🔄 Force refreshing canvas...');
    const project = this.projectState.getCurrentProject();
    if (project && this.layer) {
      this.renderProjectOnCanvas(project);
    } else {
      console.warn('⚠️ Cannot refresh canvas - no project or layer not ready');
    }
  }

  // === CANVAS METHODS ===

  private initializeCanvas(): void {
    if (!this.canvasContainer) {
      console.warn('⚠️ Canvas container not ready');
      return;
    }

    const container = this.canvasContainer.nativeElement;

    // Destroy existing stage
    if (this.stage) {
      this.stage.destroy();
    }

    console.log('🖼️ Initializing canvas...');

    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
      draggable: false,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.drawGrid();
    this.addZoomSupport();
    this.addSelectionHandling();
    this.addKeyboardSupport();
    this.addCursorSupport();
    this.addEditorStateSync();
    this.addConnectionServiceSync();

    // NEW: Initialize EditorStateService with canvas dimensions
    this.editorState.initializeEditor(container.offsetWidth, container.offsetHeight);

    window.addEventListener('resize', () => this.handleResize());

    console.log('✅ Canvas initialized, setting up project subscription...');

    // NOW setup project subscription AFTER canvas is ready
    this.projectState.currentProject$
      .pipe(takeUntil(this.destroy$))
      .subscribe(project => {
        console.log('📊 Project changed, rendering on canvas:', project ? `${project.devices.length} devices` : 'null');
        if (project && this.layer) {
          this.renderProjectOnCanvas(project);
        }
      });

    // Render current project immediately
    const currentProject = this.projectState.getCurrentProject();
    if (currentProject) {
      console.log('🎯 Rendering current project immediately:', currentProject.devices.length, 'devices');
      this.renderProjectOnCanvas(currentProject);
    }
  }

  private renderProjectOnCanvas(project: any): void {
    if (!this.layer) {
      console.warn('⚠️ Layer not ready for rendering');
      return;
    }

    console.log(`🎨 Rendering ${project.devices.length} devices and ${project.connections.length} connections on canvas...`);

    // ✅ PERFORMANCE: Clear existing objects efficiently
    const existingDevices = this.layer.find('.device');
    const existingConnections = this.layer.find('.connection');

    console.log(`🧹 Removing ${existingDevices.length} devices and ${existingConnections.length} connections`);

    existingDevices.forEach(node => node.destroy());
    existingConnections.forEach(node => node.destroy());

    // Check if selected device still exists
    if (this.selectedDevice) {
      const deviceStillExists = project.devices.some((d: any) => d.id === this.selectedDevice!.id);
      if (!deviceStillExists) {
        console.log('🔄 Selected device no longer exists, clearing selection');
        this.selectedDevice = null;
        this.selectedShape = null;
        this.cdr.detectChanges();
      }
    }

    // ✅ PERFORMANCE: Batch render devices
    project.devices.forEach((device: any, index: number) => {
      console.log(`🎯 Rendering device ${index + 1}:`, device.metadata.name, 'at', device.position);
      this.renderDevice(device);
    });

    // ✅ PERFORMANCE: Batch render connections
    console.log(`🔗 Rendering ${project.connections.length} connections...`);
    this.renderConnections(project.connections);

    // ✅ PERFORMANCE: Single batch draw at the end
    this.layer.batchDraw();
    console.log('✅ Canvas rendering completed with single batch draw');
  }

  private renderDevice(device: any): void {
    if (!this.layer) return;

    console.log(`🎨 Rendering device: ${device.metadata.name} (ID: ${device.id})`);

    // ✅ FIXED: Create device group with PROPER attributes
    const deviceGroup = new Konva.Group({
      x: device.position.x,
      y: device.position.y,
      deviceId: device.id, // ➕ ESSENTIAL: Device ID attribute
      name: 'device', // ➕ ESSENTIAL: Device class name
      listening: true,
      draggable: false // Will be set based on current mode
    });

    // ✅ FIXED: Device image with consistent attributes
    const deviceImage = new Konva.Rect({
      width: 60,
      height: 60,
      fill: device.style?.fill || '#2196F3',
      stroke: device.style?.stroke || '#1976D2',
      strokeWidth: device.style?.strokeWidth || 2,
      cornerRadius: device.style?.cornerRadius || 8,
      deviceId: device.id, // ➕ REDUNDANT: Also on child for safety
      listening: true
    });

    // Create device label
    const deviceLabel = new Konva.Text({
      x: -10,
      y: 65,
      width: 80,
      text: device.metadata.name,
      fontSize: 10,
      fontFamily: 'Arial',
      fill: '#333',
      align: 'center',
      deviceId: device.id, // ➕ REDUNDANT: Also on label
      listening: false // Labels don't need interaction
    });

    deviceGroup.add(deviceImage);
    deviceGroup.add(deviceLabel);

    // ✅ FIXED: Get current mode and apply appropriate interaction
    const editorState = this.editorState.getCurrentState();
    const currentMode = editorState.interaction.mode;

    console.log(`🔧 Setting up device interaction - Current Mode: ${currentMode}`);

    this.setupDeviceInteraction(deviceGroup, device, currentMode);

    this.layer.add(deviceGroup);

    // ✅ VERIFICATION: Immediate verification after adding
    setTimeout(() => {
      const foundDevices = this.layer.find('.device');
      const foundThisDevice = this.layer.find(`[deviceId=${device.id}]`);
      console.log(`✅ Verification - Device ${device.metadata.name}:`);
      console.log(`   Total devices on layer: ${foundDevices.length}`);
      console.log(`   This device found: ${foundThisDevice.length > 0}`);
      console.log(`   Device draggable: ${deviceGroup.draggable()}`);
    }, 10);
  }

  /**
 * HELPER: Setup device interaction based on current mode
 */
  private setupDeviceInteraction(deviceGroup: any, device: any, mode: string): void {
    // Clear existing event listeners to prevent conflicts
    deviceGroup.off();

    if (mode === 'connect') {
      // ✅ CONNECTION MODE: Non-draggable, crosshair cursor, connection logic
      deviceGroup.draggable(false);
      console.log(`🔗 Device ${device.metadata.name} setup for CONNECTION mode (non-draggable)`);

      // Connection mode click
      deviceGroup.on('click', (e: any) => {
        console.log(`🔗 Device clicked in CONNECTION mode: ${device.metadata.name}`);
        this.handleConnectionDeviceClick(device, e);
        e.cancelBubble = true;
      });

      // ✅ FIXED: Mode-aware cursor management for connection mode
      deviceGroup.on('mouseenter', () => {
        // ✅ CRITICAL: Keep crosshair in connection mode, don't override!
        this.stage.container().style.cursor = 'crosshair';
        console.log(`🎯 Device hover in CONNECTION mode: cursor stays crosshair`);
      });

      deviceGroup.on('mouseleave', () => {
        // ✅ CRITICAL: Maintain crosshair when leaving device in connection mode
        this.stage.container().style.cursor = 'crosshair';
        console.log(`🎯 Device leave in CONNECTION mode: cursor stays crosshair`);
      });

    } else {
      // ✅ SELECT MODE: Draggable, normal cursor behavior
      deviceGroup.draggable(true);
      console.log(`🎯 Device ${device.metadata.name} setup for SELECT mode (draggable)`);

      // Selection click
      deviceGroup.on('click', (e: any) => {
        console.log(`🎯 Device clicked in SELECT mode: ${device.metadata.name}`);
        this.handleDeviceSelectionSafe(device);
        e.cancelBubble = true;
      });

      // ✅ FIXED: Drag handling with undo/redo support
      let originalPosition: Point;
      let isDraggingDevice = false;

      deviceGroup.on('dragstart', (e: any) => {
        originalPosition = { ...device.position };
        isDraggingDevice = true;
        console.log(`🎯 Device drag started: ${device.metadata.name}`);
        e.cancelBubble = true;
      });

      deviceGroup.on('dragmove', (e: any) => {
        if (!isDraggingDevice) return;
        const newPosition = deviceGroup.position();
        console.log(`🔄 Device dragging to: (${newPosition.x}, ${newPosition.y})`);
        e.cancelBubble = true;
      });

      deviceGroup.on('dragend', (e: any) => {
        if (!isDraggingDevice) return;

        const finalPosition = deviceGroup.position();
        isDraggingDevice = false;

        console.log(`🏁 Device drag ended: ${device.metadata.name} at (${finalPosition.x}, ${finalPosition.y})`);

        if (originalPosition) {
          this.projectState.updateDevice(device.id, { position: finalPosition });

          const moveCommand = this.undoRedoService.createMoveDeviceCommand(
            device.id,
            finalPosition,
            originalPosition,
            this.projectState
          );
          this.undoRedoService.executeCommand(moveCommand);
        }

        e.cancelBubble = true;
      });

      // ✅ FIXED: Select mode cursor management
      deviceGroup.on('mouseenter', () => {
        this.stage.container().style.cursor = 'move';
        console.log(`🎯 Device hover in SELECT mode: cursor set to move`);
      });

      deviceGroup.on('mouseleave', () => {
        this.stage.container().style.cursor = 'default';
        console.log(`🎯 Device leave in SELECT mode: cursor reset to default`);
      });
    }
  }

  /**
 * HELPER: Handle device click in connection mode
 */
  private handleConnectionDeviceClick(device: any, e: any): void {
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    if (this.isDrawingConnection) {
      // This is the end device for the connection
      console.log(`🏁 Finishing connection at device: ${device.metadata.name}`);
      this.finishConnectionDrawing(device, pointer);
    } else {
      // This is the start device for a new connection
      console.log(`🎨 Starting connection from device: ${device.metadata.name}`);
      this.startConnectionFromDevice(device, pointer);
    }
  }

  /**
 * Handle device selection - NEW method to replace missing selectDevice
 */
  private handleDeviceSelectionSafe(device: any): void {
    console.log(`🎯 Selecting device: ${device.metadata.name} (ID: ${device.id})`);

    // Clear previous selection
    this.clearSelectionSafe();

    // Set new selection
    this.selectedDevice = device;

    // ✅ ENHANCED: Multiple ways to find device shapes
    console.log(`🔍 Looking for shapes for device ${device.id}...`);

    // Method 1: Find by deviceId attribute
    const deviceShapesById = this.layer.find(`[deviceId=${device.id}]`);
    console.log(`🔍 Found ${deviceShapesById.length} shapes by deviceId`);

    // Method 2: Find by name class and then filter
    const allDevices = this.layer.find('.device');
    console.log(`🔍 Found ${allDevices.length} total devices on layer`);

    const matchingDevices = allDevices.filter((shape: any) => {
      const shapeDeviceId = shape.getAttr('deviceId');
      console.log(`🔍 Checking device shape with ID: ${shapeDeviceId}`);
      return shapeDeviceId === device.id;
    });
    console.log(`🔍 Found ${matchingDevices.length} matching devices`);

    // Use whichever method found devices
    const deviceShapes = deviceShapesById.length > 0 ? deviceShapesById : matchingDevices;
    console.log(`🔍 Using ${deviceShapes.length} shapes for selection`);

    if (deviceShapes.length > 0) {
      deviceShapes.forEach((shape: any, index: number) => {
        console.log(`🎨 Applying selection to shape ${index + 1}: ${shape.getClassName()}`);

        if (shape instanceof Konva.Group) {
          const rect = this.getRectFromGroup(shape);
          if (rect) {
            this.setStroke(rect, '#FF9800'); // Orange selection color
            this.setStrokeWidth(rect, 4); // Thicker border
            console.log(`✅ Applied selection style to shape ${index + 1}`);
          }
          this.selectedShape = shape;
        }
      });

      this.layer.batchDraw();
      console.log(`✅ Device selected with visual feedback: ${device.metadata.name}`);
    } else {
      console.log(`❌ No shapes found for device ${device.id} - cannot apply visual selection`);
    }

    this.cdr.detectChanges();
  }

  private drawGrid(): void {
    const project = this.projectState.getCurrentProject();
    const gridSize = project?.settings.gridSize || CANVAS_CONFIG.GRID.SIZE;

    if (!project?.settings.showGrid) return;

    const width = this.stage.width();
    const height = this.stage.height();

    // Remove existing grid
    this.layer.find('.grid-line').forEach(node => node.destroy());

    for (let i = 0; i < width / gridSize; i++) {
      const line = new Konva.Line({
        points: [i * gridSize, 0, i * gridSize, height],
        stroke: CANVAS_CONFIG.GRID.COLOR,
        strokeWidth: 1,
        name: 'grid-line',
      });
      this.layer.add(line);
    }

    for (let i = 0; i < height / gridSize; i++) {
      const line = new Konva.Line({
        points: [0, i * gridSize, width, i * gridSize],
        stroke: CANVAS_CONFIG.GRID.COLOR,
        strokeWidth: 1,
        name: 'grid-line',
      });
      this.layer.add(line);
    }
  }

  private addZoomSupport(): void {
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();

      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;

      const oldScale = this.stage.scaleX();

      // ➕ НОВА ЛОГИКА: Използвай EditorStateService
      if (e.evt.deltaY > 0) {
        // Zoom out
        const result = this.editorState.zoomOut(pointer);
        if (result.success) {
          const newZoom = this.editorState.getCurrentState().zoom.level;
          this.applyZoomToStage(newZoom, pointer, oldScale);
        }
      } else {
        // Zoom in
        const result = this.editorState.zoomIn(pointer);
        if (result.success) {
          const newZoom = this.editorState.getCurrentState().zoom.level;
          this.applyZoomToStage(newZoom, pointer, oldScale);
        }
      }
    });
  }

  private addSelectionHandling(): void {
    let dragStartPosition: Point | null = null;
    let originalPanPosition: Point | null = null;
    let isDragging = false;
    let connectionStartDevice: any = null;
    let mouseDownTime: number = 0; // ➕ Track timing

    // Mouse down event
    this.stage.on('mousedown touchstart', (e) => {
      const editorState = this.editorState.getCurrentState();
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;

      dragStartPosition = { ...pointer };
      isDragging = false;
      connectionStartDevice = null;
      mouseDownTime = Date.now(); // ➕ Track start time

      console.log(`🖱️ Mouse down at (${pointer.x}, ${pointer.y}) - Mode: ${editorState.interaction.mode}`);

      if (editorState.interaction.mode === 'connect') {
        // ➕ CONNECTION MODE: Prevent default behavior first
        e.evt.preventDefault();
        e.evt.stopPropagation();

        const device = this.getDeviceFromTarget(e.target);
        if (device) {
          console.log(`🎨 Starting connection from device: ${device.metadata.name}`);
          connectionStartDevice = device;
          this.startConnectionFromDevice(device, pointer);

          // ➕ Set cursor immediately
          this.stage.container().style.cursor = 'crosshair';
        } else {
          console.log('⚠️ Connection mode requires clicking on a device');
        }
      } else if (editorState.interaction.mode === 'pan') {
        originalPanPosition = { ...editorState.pan.position };
        this.editorState.startDragPan(pointer);
        console.log('🖐️ Pan drag started');
      } else if (editorState.interaction.mode === 'select') {
        if (e.target === this.stage) {
          console.log('🔄 Clicked on stage - preparing for potential selection clear');
        } else if (e.target instanceof Konva.Shape || e.target instanceof Konva.Group) {
          console.log('🎯 Clicked on shape - preparing for selection');
        }
      }
    });

    // Mouse move event
    this.stage.on('mousemove touchmove', (e) => {
      const pointer = this.stage.getPointerPosition();
      if (!pointer || !dragStartPosition) return;

      const editorState = this.editorState.getCurrentState();

      // Calculate drag distance
      const dragDistance = Math.sqrt(
        Math.pow(pointer.x - dragStartPosition.x, 2) +
        Math.pow(pointer.y - dragStartPosition.y, 2)
      );

      // ➕ IMPROVED: Only set dragging after movement threshold AND time delay
      const timeSinceMouseDown = Date.now() - mouseDownTime;
      if (dragDistance > 3 && timeSinceMouseDown > 50 && !isDragging) {
        isDragging = true;
        console.log('🖱️ Started dragging (distance + time threshold met)');
      }

      if (editorState.interaction.mode === 'connect') {
        // ➕ CONNECTION MODE: Always update if we have a start device
        if (connectionStartDevice && this.isDrawingConnection) {
          console.log(`🎨 Connection preview update at (${pointer.x}, ${pointer.y})`);
          this.handleConnectionMouseMove(e, pointer);
        }
      } else if (isDragging && editorState.interaction.mode === 'pan') {
        this.editorState.updateDragPan(pointer);
        const currentPan = this.editorState.getCurrentState().pan;
        this.stage.position(currentPan.position);
        this.layer.batchDraw();
      }
    });

    // Mouse up event
    this.stage.on('mouseup touchend', (e) => {
      const pointer = this.stage.getPointerPosition();
      if (!pointer || !dragStartPosition) return;

      const editorState = this.editorState.getCurrentState();
      const timeSinceMouseDown = Date.now() - mouseDownTime;

      console.log(`🖱️ Mouse up at (${pointer.x}, ${pointer.y}) - Was dragging: ${isDragging}, Time: ${timeSinceMouseDown}ms`);

      if (editorState.interaction.mode === 'connect') {
        // ➕ CONNECTION MODE: Only finish if we have start device and not dragging
        if (connectionStartDevice && this.isDrawingConnection && !isDragging) {
          const endDevice = this.getDeviceFromTarget(e.target);

          if (endDevice && endDevice.id !== connectionStartDevice.id) {
            console.log(`🏁 Ending connection at device: ${endDevice.metadata.name}`);
            this.finishConnectionDrawing(endDevice, pointer);
          } else if (endDevice && endDevice.id === connectionStartDevice.id) {
            console.log('⚠️ Cannot connect device to itself - cancelling');
            this.cancelConnectionDrawing();
          } else {
            console.log('❌ Connection must end on a device - cancelling');
            this.cancelConnectionDrawing();
          }
        }
      } else if (editorState.interaction.mode === 'pan' && isDragging && originalPanPosition) {
        const finalPosition = { ...editorState.pan.position };
        this.editorState.endDragPan(finalPosition, originalPanPosition, this.undoRedoService);
        console.log('🖐️ Pan drag ended with undo/redo support');
      } else if (editorState.interaction.mode === 'select' && !isDragging) {
        // ✅ SELECT MODE: Handle selection logic
        if (e.target === this.stage) {
          console.log('🔄 Clicked on stage - clearing all selections');
          this.clearSelectionSafe();
          // ➕ ENHANCED: Clear connection selections too
          this.connectionService.clearSelection();
        } else if (e.target instanceof Konva.Shape || e.target instanceof Konva.Group) {
          console.log('🎯 Clicked on shape - selecting');
          this.selectShape(e.target as Konva.Shape);
        }
      }

      // Reset drag state
      dragStartPosition = null;
      originalPanPosition = null;
      isDragging = false;
      connectionStartDevice = null;
      mouseDownTime = 0;
    });

    // Prevent context menu on right click
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
    });
  }

  /**
 * Get current editor mode safely
 */
  private getCurrentMode(): string {
    const editorState = this.editorState.getCurrentState();
    return editorState.interaction.mode;
  }

  /**
   * Is currently in connection mode
   */
  private isInConnectionMode(): boolean {
    return this.getCurrentMode() === 'connect';
  }

  /**
   * Is currently in select mode
   */
  private isInSelectMode(): boolean {
    return this.getCurrentMode() === 'select';
  }


  /**
 * Set select mode with cursor reset
 */
  setSelectMode(): void {
    console.log('🎯 AppComponent: Switching to select mode...');

    // ✅ STEP 1: Cancel any active drawing and clean state
    this.cleanupConnectionState();

    // ✅ STEP 2: Set mode through EditorStateService
    const result = this.editorState.setMode('select' as any);
    if (result.success) {
      console.log('✅ EditorStateService: Select mode set successfully');

      // ✅ STEP 3: Wait for EditorStateService to set cursor, then confirm
      setTimeout(() => {
        if (this.stage && this.stage.container()) {
          // Only set cursor if it's not already default
          const currentCursor = this.stage.container().style.cursor;
          if (currentCursor !== 'default' && currentCursor !== 'pointer') {
            this.stage.container().style.cursor = 'default';
            console.log('🎯 Cursor corrected to default');
          } else {
            console.log('✅ Cursor already default/pointer');
          }
        }

        // ✅ STEP 4: Update device rendering (enable dragging in select mode)
        this.updateDeviceInteractionMode('select');

        // ✅ STEP 5: Clear any connection selections
        if (this.connectionService) {
          this.connectionService.clearSelection();
          console.log('🔗 Connection selections cleared');
        }

        console.log('✅ Select mode fully activated');
      }, 50);

    } else {
      console.error('❌ Failed to set select mode:', result.error);
    }
  }

  private addKeyboardSupport(): void {
    // Add keyboard event listeners to window
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifiers = {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey
      };

      console.log(`⌨️ Key pressed: ${e.key} with modifiers:`, modifiers);

      // Handle keyboard shortcuts through EditorStateService
      const result = this.editorState.handleKeyboardShortcut(e.key, modifiers);

      if (result.success) {
        e.preventDefault();

        // Apply changes to Konva stage
        const editorState = this.editorState.getCurrentState();

        if (this.stage) {
          this.stage.scale({ x: editorState.zoom.level, y: editorState.zoom.level });
          this.stage.position(editorState.pan.position);
          this.layer.batchDraw();
        }

        console.log('✅ Keyboard shortcut applied:', result.message);
      }

      // Handle undo/redo shortcuts
      if (modifiers.ctrl && !modifiers.shift && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undoLastAction();
      } else if ((modifiers.ctrl && modifiers.shift && e.key.toLowerCase() === 'z') ||
        (modifiers.ctrl && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        this.redoLastAction();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Handle key up events if needed
      if (e.key === ' ') {
        // Space key released - could toggle back to select mode
        console.log('🚀 Space key released');
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Store reference for cleanup
    this.keyboardHandlers = { handleKeyDown, handleKeyUp };
  }

  private addCursorSupport(): void {
    // Subscribe to cursor changes and apply to canvas container
    this.editorState.cursor$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cursor => {
        if (this.canvasContainer?.nativeElement) {
          this.canvasContainer.nativeElement.style.cursor = cursor;
          console.log(`🎯 Cursor updated to: ${cursor}`);
        }
      });
  }

  private addEditorStateSync(): void {
    // Auto-sync pan state changes to Konva stage
    this.editorState.panState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(panState => {
        if (this.stage && this.layer) {
          const currentPosition = this.stage.position();
          const newPosition = panState.position;

          // Only update if position actually changed to avoid unnecessary redraws
          if (Math.abs(currentPosition.x - newPosition.x) > 0.1 ||
            Math.abs(currentPosition.y - newPosition.y) > 0.1) {

            this.stage.position(newPosition);
            this.layer.batchDraw();
            console.log(`🔄 Auto-synced Konva stage to pan position: (${newPosition.x}, ${newPosition.y})`);
          }
        }
      });

    // Auto-sync zoom state changes to Konva stage
    this.editorState.zoomState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(zoomState => {
        if (this.stage && this.layer) {
          const currentScale = this.stage.scaleX();
          const newScale = zoomState.level;

          // Only update if scale actually changed
          if (Math.abs(currentScale - newScale) > 0.001) {
            this.stage.scale({ x: newScale, y: newScale });
            this.layer.batchDraw();
            console.log(`🔍 Auto-synced Konva stage to zoom level: ${Math.round(newScale * 100)}%`);
          }
        }
      });
  }

  private addConnectionServiceSync(): void {
    // Sync connections from ProjectStateService to ConnectionService
    this.projectState.currentProject$
      .pipe(takeUntil(this.destroy$))
      .subscribe(project => {
        if (project) {
          // Update ConnectionService with project connections
          this.connectionService.setConnections(project.connections);

          // Update available anchors from devices
          this.connectionService.updateAnchorsFromDevices(project.devices);

          // Enable connection service when project is active
          this.connectionService.enable();

          console.log(`🔗 ConnectionService synced: ${project.connections.length} connections, ${project.devices.length} devices`);
        } else {
          // Disable connection service when no project
          this.connectionService.disable();
          console.log('🔗 ConnectionService disabled - no active project');
        }
      });
  }

  // Add cleanup method for keyboard handlers
  private keyboardHandlers?: {
    handleKeyDown: (e: KeyboardEvent) => void;
    handleKeyUp: (e: KeyboardEvent) => void;
  };

  private selectShape(shape: Konva.Shape): void {
    console.log('🎯 Shape selection triggered:', shape.getClassName());

    // Find device ID from shape or parent
    let deviceId = shape.getAttr('deviceId');

    if (!deviceId && shape.getParent) {
      const parent = shape.getParent();
      deviceId = parent?.getAttr('deviceId');
    }

    if (deviceId) {
      const device = this.projectState.getDevice(deviceId);
      if (device) {
        this.handleDeviceSelectionSafe(device);
      } else {
        console.warn('⚠️ Device not found for shape selection:', deviceId);
      }
    } else {
      console.warn('⚠️ No deviceId found for shape selection');
    }
  }

  private clearSelectionSafe(): void {
    if (this.selectedShape) {
      if (this.selectedShape instanceof Konva.Group) {
        const rect = this.getRectFromGroup(this.selectedShape);
        if (rect) {
          // Get device to restore original colors
          const deviceId = this.selectedShape.getAttr('deviceId');
          const device = this.projectState.getDevice(deviceId);

          if (device) {
            this.setStroke(rect, device.style?.stroke || '#1976D2');
            this.setStrokeWidth(rect, device.style?.strokeWidth || 2);
          } else {
            // Fallback colors
            this.setStroke(rect, '#1976D2');
            this.setStrokeWidth(rect, 2);
          }
        }
      } else {
        // If it's a Shape, not a Group
        this.setStroke(this.selectedShape, '#1976D2');
        this.setStrokeWidth(this.selectedShape, 2);
      }

      this.selectedShape = null;
    }

    this.selectedDevice = null;
    this.layer?.batchDraw();
    this.cdr.detectChanges();

    console.log('🧹 Selection cleared safely');
  }

  private clearCanvas(): void {
    if (this.layer) {
      this.layer.destroyChildren();
      this.layer.batchDraw();
    }
    this.clearSelectionSafe();
  }

  toggleCanvasMode(): void {
    this.currentCanvasMode = this.currentCanvasMode === CanvasMode.SELECT
      ? CanvasMode.PAN
      : CanvasMode.SELECT;
  }

  private handleResize(): void {
    if (!this.stage || !this.canvasContainer) return;

    const container = this.canvasContainer.nativeElement;
    this.stage.size({
      width: container.offsetWidth,
      height: container.offsetHeight,
    });
    this.drawGrid();
    this.layer.batchDraw();
  }

  /**
 * Type-safe method to check if shape is Group
 */
  private isKonvaGroup(shape: any): shape is Konva.Group {
    return shape instanceof Konva.Group;
  }

  /**
   * Type-safe method to get rect from group
   */
  private getRectFromGroup(group: Konva.Group): Konva.Rect | undefined {
    const rect = group.findOne('Rect');
    return rect as Konva.Rect | undefined;
  }

  /**
   * Type-safe device style access
   */
  private getDeviceStrokeColor(device: any): string {
    return device.style?.stroke || '#1976D2';
  }

  private getDeviceStrokeWidth(device: any): number {
    return device.style?.strokeWidth || 2;
  }

  private getDeviceFillColor(device: any): string {
    return device.style?.fill || '#2196F3';
  }

  /**
 * Type-safe method to set stroke on Konva element
 */
  private setStroke(element: any, color: string): void {
    if (element && typeof element.stroke === 'function') {
      element.stroke(color);
    }
  }

  /**
   * Type-safe method to set stroke width on Konva element
   */
  private setStrokeWidth(element: any, width: number): void {
    if (element && typeof element.strokeWidth === 'function') {
      element.strokeWidth(width);
    }
  }

  /**
 * Enhanced debug device selection state
 */
  debugDeviceSelection(): void {
    console.log('🐛 Device Selection Debug:');
    console.log('  Selected Device:', this.selectedDevice?.metadata?.name || 'None');
    console.log('  Selected Shape Class:', this.selectedShape?.getClassName() || 'None');
    console.log('  Selected Shape Type:', this.selectedShape ? typeof this.selectedShape : 'None');

    if (this.selectedShape) {
      console.log('  Shape DeviceId:', this.selectedShape.getAttr('deviceId'));
      console.log('  Is Group:', this.selectedShape instanceof Konva.Group);

      if (this.selectedShape instanceof Konva.Group) {
        const rect = this.getRectFromGroup(this.selectedShape);
        console.log('  Has Rect Child:', !!rect);
        if (rect) {
          console.log('  Rect Stroke:', (rect as any).stroke());
          console.log('  Rect Stroke Width:', (rect as any).strokeWidth());
        }
      }
    }

    const project = this.projectState.getCurrentProject();
    console.log('  Total Devices in Project:', project?.devices?.length || 0);

    // ✅ ENHANCED: Check devices on canvas
    if (this.layer) {
      const devicesOnCanvas = this.layer.find('.device');
      console.log('  Devices on Canvas:', devicesOnCanvas.length);

      devicesOnCanvas.forEach((deviceGroup: any, index: number) => {
        const deviceId = deviceGroup.getAttr('deviceId');
        const device = this.projectState.getDevice(deviceId);
        console.log(`    Device ${index + 1}: ${device?.metadata?.name || 'Unknown'} (${deviceId})`);
      });
    }
  }

  /**
 * Debug connection state
 */
  debugConnectionState(): void {
    const project = this.projectState.getCurrentProject();
    console.log('🐛 Connection State Debug:');
    console.log('  Project Connections:', project?.connections?.length || 0);

    // ✅ FIXED: Use component property instead of .value
    console.log('  Component Connections Array:', this.currentConnections.length);
    console.log('  Selected Connections:', this.selectedConnections.length);
    console.log('  Is Drawing:', this.isDrawingConnection);
    console.log('  Current Drawing State:', this.currentDrawingState);

    if (project?.connections) {
      project.connections.forEach((conn: any, index: number) => {
        console.log(`  Connection ${index + 1}:`, {
          id: conn.id,
          style: conn.visualStyle?.style,
          stroke: conn.visualStyle?.stroke,
          points: conn.points?.length,
          sourceDevice: conn.sourceDeviceId,
          targetDevice: conn.targetDeviceId
        });
      });
    }
  }

  /**
   * Debug rendering performance
   */
  debugRenderingPerformance(): void {
    console.log('🐛 Rendering Performance Debug:');
    console.log('  Layer objects:', this.layer?.children?.length || 0);
    console.log('  Devices on layer:', this.layer?.find('.device')?.length || 0);
    console.log('  Connections on layer:', this.layer?.find('.connection')?.length || 0);
    console.log('  Connection previews on layer:', this.layer?.find('.connection-preview')?.length || 0);
    console.log('  Selected shape:', this.selectedShape?.getClassName() || 'None');
    console.log('  Selected device:', this.selectedDevice?.metadata?.name || 'None');

    // ✅ ENHANCED: Check for duplicate objects
    const allObjects = this.layer?.children || [];
    const deviceIds = new Set();
    const connectionIds = new Set();

    allObjects.forEach(obj => {
      const deviceId = obj.getAttr('deviceId');
      const connectionId = obj.getAttr('connectionId');

      if (deviceId) deviceIds.add(deviceId);
      if (connectionId) connectionIds.add(connectionId);
    });

    console.log('  Unique Device IDs on canvas:', deviceIds.size);
    console.log('  Unique Connection IDs on canvas:', connectionIds.size);
  }

  /**
 * Debug current mode - ENHANCED
 */
  debugCurrentMode(): void {
    const editorState = this.editorState.getCurrentState();
    console.log('🐛 Current Mode Debug:');
    console.log('  Editor Mode:', editorState.interaction.mode);
    console.log('  Is Drawing Connection:', this.isDrawingConnection);
    console.log('  Selected Device:', this.selectedDevice?.metadata?.name || 'None');
    console.log('  Selected Connections:', this.selectedConnections.length);
    console.log('  Current Cursor:', this.stage?.container()?.style?.cursor || 'unknown');
    console.log('  Stage exists:', !!this.stage);
    console.log('  Layer exists:', !!this.layer);
  }

  /**
 * Comprehensive debug method - Debug everything at once
 */
  debugEverything(): void {
    console.log('🐛🐛🐛 COMPREHENSIVE DEBUG REPORT 🐛🐛🐛');
    console.log('='.repeat(50));

    this.debugCurrentMode();
    console.log('');

    this.debugDeviceSelection();
    console.log('');

    this.debugConnectionState();
    console.log('');

    this.debugRenderingPerformance();
    console.log('');

    // ✅ FIXED: Properly get editorState
    const project = this.projectState.getCurrentProject();
    const editorState = this.editorState.getCurrentState(); // ➕ ДОБАВЕНО

    console.log('🐛 System State:');
    console.log('  Project ID:', project?.id || 'None');
    console.log('  Project Title:', project?.metadata?.title || 'None');
    console.log('  Canvas Size:', {
      width: this.stage?.width() || 0,
      height: this.stage?.height() || 0
    });
    // ✅ FIXED: Now editorState is properly defined
    console.log('  Zoom Level:', Math.round((editorState.zoom.level || 1) * 100) + '%');
    console.log('  Pan Position:', editorState.pan.position);

    console.log('='.repeat(50));
  }

  /**
 * Debug device finding specifically
 */
  debugDeviceFinding(): void {
    console.log('🐛 Device Finding Debug:');

    const project = this.projectState.getCurrentProject();
    if (!project?.devices?.length) {
      console.log('❌ No devices in project');
      return;
    }

    console.log(`📊 Project has ${project.devices.length} devices`);

    // Check each device individually
    project.devices.forEach((device: any, index: number) => {
      console.log(`\n🔍 Device ${index + 1}: ${device.metadata.name} (${device.id})`);

      // Method 1: Find by class name
      const allDevices = this.layer?.find('.device') || [];
      console.log(`  All devices on layer: ${allDevices.length}`);

      // Method 2: Find by deviceId attribute
      const deviceById = this.layer?.find(`[deviceId=${device.id}]`) || [];
      console.log(`  Found by deviceId: ${deviceById.length}`);

      // Method 3: Manual search through all children
      const allChildren = this.layer?.children || [];
      const manualFound = allChildren.filter((child: any) => {
        const childDeviceId = child.getAttr('deviceId');
        return childDeviceId === device.id;
      });
      console.log(`  Found manually: ${manualFound.length}`);

      // Check attributes of found shapes
      if (deviceById.length > 0) {
        deviceById.forEach((shape: any, shapeIndex: number) => {
          console.log(`    Shape ${shapeIndex + 1}:`);
          console.log(`      Class: ${shape.getClassName()}`);
          console.log(`      Name: ${shape.name()}`);
          console.log(`      DeviceId: ${shape.getAttr('deviceId')}`);
          console.log(`      Listening: ${shape.listening()}`);
          console.log(`      Visible: ${shape.visible()}`);
        });
      }
    });
  }

  /**
   * Debug layer objects
   */
  debugLayerObjects(): void {
    console.log('🐛 Layer Objects Debug:');

    const allChildren = this.layer?.children || [];
    console.log(`📊 Total objects on layer: ${allChildren.length}`);

    // Group by class name
    const objectsByClass: Record<string, number> = {};
    const objectsByName: Record<string, number> = {};

    allChildren.forEach((child: any) => {
      const className = child.getClassName();
      const name = child.name() || 'unnamed';

      objectsByClass[className] = (objectsByClass[className] || 0) + 1;
      objectsByName[name] = (objectsByName[name] || 0) + 1;
    });

    console.log('📊 Objects by class:', objectsByClass);
    console.log('📊 Objects by name:', objectsByName);

    // Look for device objects specifically
    const deviceLikeObjects = allChildren.filter((child: any) => {
      const name = child.name();
      const deviceId = child.getAttr('deviceId');
      return name === 'device' || deviceId;
    });

    console.log(`🎯 Device-like objects: ${deviceLikeObjects.length}`);
    deviceLikeObjects.forEach((obj: any, index: number) => {
      console.log(`  ${index + 1}: ${obj.getClassName()} - ${obj.name()} - deviceId: ${obj.getAttr('deviceId')}`);
    });
  }
  /**
   * Quick test device selection - ENHANCED
   */
  testDeviceSelection(): void {
    const project = this.projectState.getCurrentProject();
    if (project!?.devices?.length > 0) {
      const firstDevice = project!.devices[0];
      console.log('🧪 Testing device selection with:', firstDevice.metadata.name);
      console.log('  Before selection - Selected device:', this.selectedDevice?.metadata?.name || 'None');

      this.handleDeviceSelectionSafe(firstDevice);

      // Check after selection
      setTimeout(() => {
        console.log('  After selection - Selected device:', this.selectedDevice?.metadata?.name || 'None');
        console.log('  Visual selection applied:', !!this.selectedShape);
      }, 100);
    } else {
      console.log('⚠️ No devices to test selection');
    }
  }

  /**
   * Quick test cursor changes - ENHANCED
   */
  testCursorChanges(): void {
    console.log('🧪 Testing cursor changes...');

    // Test connection mode
    console.log('  🔗 Setting connection mode...');
    this.setConnectionMode();

    setTimeout(() => {
      const currentCursor1 = this.stage?.container()?.style?.cursor;
      console.log('  Current cursor after connection mode:', currentCursor1);
      console.log('  Expected: crosshair, Actual:', currentCursor1, currentCursor1 === 'crosshair' ? '✅' : '❌');

      // Test select mode
      console.log('  🎯 Setting select mode...');
      this.setSelectMode();

      setTimeout(() => {
        const currentCursor2 = this.stage?.container()?.style?.cursor;
        console.log('  Current cursor after select mode:', currentCursor2);
        console.log('  Expected: default, Actual:', currentCursor2, currentCursor2 === 'default' ? '✅' : '❌');
      }, 100);
    }, 100);
  }

  /**
 * Test device dragging specifically
 */
  testDeviceDragging(): void {
    console.log('🧪 Testing device dragging...');

    const project = this.projectState.getCurrentProject();
    if (!project?.devices?.length) {
      console.log('❌ No devices to test dragging');
      return;
    }

    const device = project.devices[0];
    console.log('  Testing with device:', device.metadata.name);
    console.log('  Current position:', device.position);
    console.log('  Device on canvas:', !!this.layer?.find(`[deviceId=${device.id}]`)?.length);

    // Check if device is draggable
    const deviceShapes = this.layer?.find(`[deviceId=${device.id}]`) || [];
    deviceShapes.forEach((shape: any) => {
      if (shape instanceof Konva.Group) {
        console.log('  Device draggable:', shape.draggable());
        console.log('  Device listening:', shape.listening());
      }
    });
  }

  /**
   * Test connection creation process
   */
  testConnectionCreation(): void {
    console.log('🧪 Testing connection creation process...');

    const project = this.projectState.getCurrentProject();
    if (!project?.devices?.length || project.devices.length < 2) {
      console.log('❌ Need at least 2 devices to test connections');
      return;
    }

    console.log('  Current connections:', project.connections.length);

    // ✅ FIXED: Remove .value and use alternative check
    console.log('  Connection service exists:', !!this.connectionService);
    console.log('  Drawing state exists:', !!this.currentDrawingState);
    console.log('  Is drawing connection:', this.isDrawingConnection);

    // ✅ ENHANCED: Check service state through editor
    const editorState = this.editorState.getCurrentState();
    console.log('  Current editor mode:', editorState.interaction.mode);
    console.log('  Can create connections:', editorState.interaction.mode === 'connect');

    // Check if devices are properly set up for connections
    project.devices.slice(0, 2).forEach((device: any, index: number) => {
      console.log(`  Device ${index + 1}: ${device.metadata.name}`);
      console.log(`    Position: (${device.position.x}, ${device.position.y})`);
      console.log(`    On canvas: ${!!this.layer?.find(`[deviceId=${device.id}]`)?.length}`);

      // ✅ ENHANCED: Check device interaction setup
      const deviceShapes = this.layer?.find(`[deviceId=${device.id}]`) || [];
      deviceShapes.forEach((shape: any) => {
        if (shape instanceof Konva.Group) {
          console.log(`    Device ${index + 1} draggable: ${shape.draggable()}`);
          console.log(`    Device ${index + 1} listening: ${shape.listening()}`);
        }
      });
    });
  }


  /**
   * Test connection styling
   */
  testConnectionStyling(): void {
    console.log('🧪 Testing connection styling...');

    const project = this.projectState.getCurrentProject();
    if (!project?.connections?.length) {
      console.log('❌ No connections to test styling');
      return;
    }

    project.connections.forEach((connection: any, index: number) => {
      console.log(`  Connection ${index + 1}: ${connection.id}`);
      console.log(`    Visual style:`, connection.visualStyle);
      console.log(`    Style type:`, connection.visualStyle?.style);
      console.log(`    Should be dashed:`, connection.visualStyle?.style === 'dashed');

      // Check on canvas
      const connectionLines = this.layer?.find(`#${connection.id}`) || [];
      console.log(`    Lines on canvas: ${connectionLines.length}`);

      connectionLines.forEach((line: any) => {
        console.log(`      Line dash:`, (line as any).dash());
        console.log(`      Line stroke:`, (line as any).stroke());
      });
    });
  }


  /**
   * Run all tests automatically
   */
  runAllTests(): void {
    console.log('🧪🧪🧪 RUNNING AUTOMATED TEST SUITE 🧪🧪🧪');
    console.log('='.repeat(60));

    // Test 1: Device Selection
    console.log('📋 Test 1: Device Selection');
    this.testDeviceSelection();

    setTimeout(() => {
      // Test 2: Cursor Management  
      console.log('📋 Test 2: Cursor Management');
      this.testCursorChanges();

      setTimeout(() => {
        // Test 3: Device Dragging
        console.log('📋 Test 3: Device Dragging');
        this.testDeviceDragging();

        setTimeout(() => {
          // Test 4: Connection Creation
          console.log('📋 Test 4: Connection Creation');
          this.testConnectionCreation();

          setTimeout(() => {
            // Test 5: Connection Styling
            console.log('📋 Test 5: Connection Styling');
            this.testConnectionStyling();

            setTimeout(() => {
              console.log('='.repeat(60));
              console.log('✅ AUTOMATED TEST SUITE COMPLETED');
              console.log('📊 Check above results for any ❌ failures');
            }, 200);
          }, 300);
        }, 300);
      }, 600);
    }, 300);
  }

  // === QUICK Problem-Specific Tests ===

  /**
   * Quick test for Problem 1: Device Selection & Dragging
   */
  testProblem1(): void {
    console.log('🎯 PROBLEM 1 TEST: Device Selection & Dragging');
    console.log('-'.repeat(40));

    const editorState = this.editorState.getCurrentState();
    console.log('✓ Current mode:', editorState.interaction.mode);
    console.log('✓ Expected for selection: select');

    if (editorState.interaction.mode !== 'select') {
      console.log('❌ Switch to SELECT mode first!');
      this.setSelectMode();
    }

    this.testDeviceSelection();
    setTimeout(() => {
      this.testDeviceDragging();
    }, 200);
  }

  /**
   * Quick test for Problems 2,3,4: Connection Issues  
   */
  testProblems234(): void {
    console.log('🎯 PROBLEMS 2,3,4 TEST: Connection Issues');
    console.log('-'.repeat(40));

    const editorState = this.editorState.getCurrentState();
    console.log('✓ Current mode:', editorState.interaction.mode);

    this.testConnectionCreation();
    setTimeout(() => {
      this.testConnectionStyling();
    }, 200);
  }

  /**
   * Quick test for Problem 5: Cursor Management
   */
  testProblem5(): void {
    console.log('🎯 PROBLEM 5 TEST: Cursor Management');
    console.log('-'.repeat(40));

    this.testCursorChanges();
  }

  // === VISUAL Feedback Test ===

  /**
   * Test visual feedback on canvas
   */
  testVisualFeedback(): void {
    console.log('🎨 Testing visual feedback...');

    const project = this.projectState.getCurrentProject();
    if (!project) {
      console.log('❌ No project loaded');
      return;
    }

    console.log('📊 Canvas Objects Summary:');
    console.log('  Total children on layer:', this.layer?.children?.length || 0);
    console.log('  Devices on canvas:', this.layer?.find('.device')?.length || 0);
    console.log('  Connections on canvas:', this.layer?.find('.connection')?.length || 0);
    console.log('  Preview connections:', this.layer?.find('.connection-preview')?.length || 0);

    console.log('📊 Project Data Summary:');
    console.log('  Devices in project:', project.devices?.length || 0);
    console.log('  Connections in project:', project.connections?.length || 0);

    // Check for mismatches
    const canvasDevices = this.layer?.find('.device')?.length || 0;
    const projectDevices = project.devices?.length || 0;
    const canvasConnections = this.layer?.find('.connection')?.length || 0;
    const projectConnections = project.connections?.length || 0;

    console.log('🔍 Data Consistency Check:');
    console.log('  Devices match:', canvasDevices === projectDevices ? '✅' : '❌');
    console.log('  Connections match:', canvasConnections === projectConnections ? '✅' : '❌');

    if (canvasDevices !== projectDevices) {
      console.log(`    Canvas: ${canvasDevices}, Project: ${projectDevices}`);
    }
    if (canvasConnections !== projectConnections) {
      console.log(`    Canvas: ${canvasConnections}, Project: ${projectConnections}`);
    }
  }

  /**
 * Apply zoom to Konva stage with proper positioning
 */
  private applyZoomToStage(newScale: number, pointer: Point, oldScale: number): void {
    this.stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - (pointer.x - this.stage.x()) * newScale / oldScale,
      y: pointer.y - (pointer.y - this.stage.y()) * newScale / oldScale,
    };

    this.stage.position(newPos);
    this.layer.batchDraw();

    // ➕ SYNC: Update EditorStateService pan state
    this.editorState.setPan(newPos);
  }
}