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
  private selectedShape: Konva.Shape | null = null;

  // Component state
  selectedDevice: Device | null = null;

  // Manual subscription management
  private destroy$ = new Subject<void>();

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
      this.clearSelection();

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

    console.log(`🎨 Rendering ${project.devices.length} devices on canvas...`);

    // Clear existing devices
    const existingDevices = this.layer.find('.device');
    console.log(`🧹 Removing ${existingDevices.length} existing devices`);
    existingDevices.forEach(node => node.destroy());

    // Check if selected device still exists in project
    if (this.selectedDevice) {
      const deviceStillExists = project.devices.some((d: Device) => d.id === this.selectedDevice!.id);
      if (!deviceStillExists) {
        console.log('🔄 Selected device no longer exists, clearing selection');
        this.selectedDevice = null;
        this.selectedShape = null;
        this.cdr.detectChanges();
      }
    }

    // Render all devices
    project.devices.forEach((device: Device, index: number) => {
      console.log(`🎯 Rendering device ${index + 1}:`, device.metadata.name, 'at', device.position);
      this.renderDevice(device);
    });

    this.layer.batchDraw();
    console.log('✅ Canvas render complete');
  }

  private renderDevice(device: Device): void {
    if (!this.layer) {
      console.warn('⚠️ Layer not ready for device rendering');
      return;
    }

    console.log('🔧 Creating Konva shapes for device:', device.metadata.name);

    const konvaDevice = new Konva.Rect({
      x: device.position.x,
      y: device.position.y,
      width: device.size.width,
      height: device.size.height,
      fill: device.style.fill,
      stroke: device.style.stroke,
      strokeWidth: device.style.strokeWidth,
      draggable: true,
      deviceId: device.id,
      name: 'device', // For easy finding
    });

    const label = new Konva.Text({
      x: device.position.x + 5,
      y: device.position.y + device.size.height / 2 - 8,
      text: device.metadata.name,
      fontSize: 11,
      fontFamily: 'Inter',
      fill: '#fff',
      listening: false,
    });

    // Update device position on drag
    konvaDevice.on('dragend', () => {
      const newPosition = {
        x: konvaDevice.x(),
        y: konvaDevice.y(),
      };

      console.log('📍 Device dragged to:', newPosition);
      this.projectState.updateDevice(device.id, { position: newPosition });

      // Update label position
      label.position({
        x: newPosition.x + 5,
        y: newPosition.y + device.size.height / 2 - 8,
      });

      // Update selected device info if this device is selected
      if (this.selectedDevice && this.selectedDevice.id === device.id) {
        this.selectedDevice = { ...this.selectedDevice, position: newPosition };
        this.cdr.detectChanges();
      }

      this.layer.batchDraw();
    });

    console.log('➕ Adding device shapes to layer');
    this.layer.add(konvaDevice);
    this.layer.add(label);

    console.log(`✅ Device rendered: ${device.metadata.name} at (${device.position.x}, ${device.position.y})`);
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

    // Mouse down event
    this.stage.on('mousedown touchstart', (e) => {
      const editorState = this.editorState.getCurrentState();
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;

      dragStartPosition = { ...pointer };
      isDragging = false;

      console.log(`🖱️ Mouse down at (${pointer.x}, ${pointer.y}) - Mode: ${editorState.interaction.mode}`);

      if (editorState.interaction.mode === CanvasMode.PAN) {
        // Start pan operation
        originalPanPosition = { ...editorState.pan.position };
        this.editorState.startDragPan(pointer);
        console.log('🖐️ Pan drag started');
      } else if (editorState.interaction.mode === CanvasMode.SELECT) {
        // Handle selection logic (existing code)
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

      // Calculate drag distance to determine if we're dragging
      const dragDistance = Math.sqrt(
        Math.pow(pointer.x - dragStartPosition.x, 2) +
        Math.pow(pointer.y - dragStartPosition.y, 2)
      );

      if (dragDistance > 5 && !isDragging) {
        isDragging = true;
        console.log('🚀 Drag threshold exceeded - starting drag operation');
      }

      if (isDragging && editorState.interaction.mode === CanvasMode.PAN) {
        // Update pan position
        this.editorState.updateDragPan(pointer);

        // Apply to Konva stage immediately for smooth dragging
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

      console.log(`🖱️ Mouse up at (${pointer.x}, ${pointer.y}) - Was dragging: ${isDragging}`);

      if (editorState.interaction.mode === CanvasMode.PAN && isDragging && originalPanPosition) {
        // End pan operation with undo/redo support
        const finalPosition = { ...editorState.pan.position };
        this.editorState.endDragPan(finalPosition, originalPanPosition, this.undoRedoService);
        console.log('🖐️ Pan drag ended with undo/redo support');
      } else if (editorState.interaction.mode === CanvasMode.SELECT && !isDragging) {
        // Handle selection logic (existing code)
        if (e.target === this.stage) {
          console.log('🔄 Clicked on stage - clearing selection');
          this.clearSelection();
        } else if (e.target instanceof Konva.Shape || e.target instanceof Konva.Group) {
          console.log('🎯 Clicked on shape - selecting');
          this.selectShape(e.target as Konva.Shape);
        }
      }

      // Reset drag state
      dragStartPosition = null;
      originalPanPosition = null;
      isDragging = false;
    });

    // Prevent context menu on right click
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
    });
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

  // Add cleanup method for keyboard handlers
  private keyboardHandlers?: {
    handleKeyDown: (e: KeyboardEvent) => void;
    handleKeyUp: (e: KeyboardEvent) => void;
  };

  private selectShape(shape: Konva.Shape): void {
    this.clearSelection();

    this.selectedShape = shape;
    const deviceId = shape.getAttr('deviceId');

    if (deviceId) {
      this.selectedDevice = this.projectState.getDevice(deviceId);
      console.log('🎯 Device selected:', this.selectedDevice?.metadata.name);
    }

    shape.stroke(CANVAS_CONFIG.SELECTION.COLOR);
    shape.strokeWidth(CANVAS_CONFIG.SELECTION.STROKE_WIDTH);
    this.layer.batchDraw();

    // Trigger Angular change detection for UI updates
    this.cdr.detectChanges();
  }

  private clearSelection(): void {
    if (this.selectedShape) {
      this.selectedShape.stroke('#333');
      this.selectedShape.strokeWidth(2);
      this.layer.batchDraw();
    }

    this.selectedShape = null;
    this.selectedDevice = null;

    // Trigger Angular change detection for UI updates
    this.cdr.detectChanges();
    console.log('🔄 Selection cleared');
  }

  private clearCanvas(): void {
    if (this.layer) {
      this.layer.destroyChildren();
      this.layer.batchDraw();
    }
    this.clearSelection();
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