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

        <mat-card style="margin-bottom: 16px;">
          <mat-card-header>
            <mat-card-title>Device Library</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button 
                mat-raised-button 
                color="primary" 
                (click)="addTypedDevice(DeviceType.ROUTER)"
                [disabled]="!(projectState.hasActiveProject$ | async)">
                {{ DEVICE_CONFIG[DeviceType.ROUTER].icon }} Router
              </button>
              <button 
                mat-raised-button 
                color="primary" 
                (click)="addTypedDevice(DeviceType.SWITCH)"
                [disabled]="!(projectState.hasActiveProject$ | async)">
                {{ DEVICE_CONFIG[DeviceType.SWITCH].icon }} Switch
              </button>
              <button 
                mat-raised-button 
                color="primary" 
                (click)="addTypedDevice(DeviceType.SERVER)"
                [disabled]="!(projectState.hasActiveProject$ | async)">
                {{ DEVICE_CONFIG[DeviceType.SERVER].icon }} Server
              </button>
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
  `]
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;

  // Inject ProjectStateService and ChangeDetectorRef
  readonly projectState = inject(ProjectStateService);
  readonly editorState = inject(EditorStateService);
  readonly undoRedoService = inject(UndoRedoService);
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

  // === DEVICE ACTIONS ===

  addDevice(): void {
    this.addTypedDevice(DeviceType.ROUTER);
  }

  addTypedDevice(type: DeviceType): void {
    const config = DEVICE_CONFIG[type];
    if (!config) return;

    const project = this.projectState.getCurrentProject();
    if (!project) return;

    const position: Point = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100
    };

    const device: Device = {
      id: IdUtils.generateDeviceId(type),
      type,
      position: project.settings.snapToGrid
        ? MathUtils.snapToGrid(position, project.settings.gridSize)
        : position,
      size: config.defaultSize,
      rotation: 0,
      metadata: {
        name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${project.devices.length + 1}`,
        description: `${type} device created via Command Pattern`,  // ➕ ОБНОВЕНО ОПИСАНИЕ
      },
      style: {
        fill: config.color,
        stroke: '#333',
        strokeWidth: 2,
        opacity: 1,
        cornerRadius: 4,
      },
      isSelected: false,
      isLocked: false,
      layerIndex: CANVAS_CONFIG.LAYERS.DEVICES,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // ➕ НОВА ЛОГИКА: Използвай Command Pattern
      const command = this.undoRedoService.createAddDeviceCommand(device, this.projectState);
      this.undoRedoService.executeCommand(command);

      console.log(`✅ Device added via command: ${device.metadata.name}`);
    } catch (error) {
      console.error('❌ Error adding device via command:', error);
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