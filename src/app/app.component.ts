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

        <mat-card>
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
              {{ (projectState.hasActiveProject$ | async) ? '🎉 Project Loaded!' : '⚠️ No Active Project' }}
            </h4>
            <p style="margin: 0; font-size: 14px;">
              {{ (projectState.hasActiveProject$ | async) 
                ? 'ProjectStateService managing project state reactively' 
                : 'Create a new project to start designing' }}
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
              <div>Zoom: {{ getZoomPercentage() }}%</div>
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
  zoomLevel: number = CANVAS_CONFIG.ZOOM.DEFAULT;

  // Manual subscription management
  private destroy$ = new Subject<void>();

  constructor() {
    // Device count logging (keep this for debugging)
    this.projectState.deviceCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log(`🎯 Device count updated: ${count}`);
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

    if (this.stage) {
      this.stage.destroy();
    }
  }

  // === PROJECT ACTIONS ===

  createNewProject(): void {
    const project = this.projectState.createNewProject({
      title: `Network Diagram ${new Date().toLocaleDateString()}`,
      author: 'Network Editor User',
      description: 'Created with ProjectStateService',
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
        description: `${type} device created via ProjectStateService`,
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
      this.projectState.addDevice(device);
      console.log(`✅ Device added: ${device.metadata.name}`);
    } catch (error) {
      console.error('❌ Error adding device:', error);
    }
  }

  deleteSelectedDevice(): void {
    if (!this.selectedDevice) return;

    const deviceName = this.selectedDevice.metadata.name;
    const deviceId = this.selectedDevice.id;

    // Clear selection FIRST before removing from service
    this.clearSelection();

    // Then remove from project
    this.projectState.removeDevice(deviceId);

    console.log(`🗑️ Device deleted: ${deviceName}`);
  }

  clearAllDevices(): void {
    const project = this.projectState.getCurrentProject();
    if (!project) return;

    // Remove all devices (which will trigger canvas re-render)
    project.devices.forEach(device => {
      this.projectState.removeDevice(device.id);
    });

    console.log('🧹 All devices cleared');
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

      const oldScale = this.stage.scaleX();
      const pointer = this.stage.getPointerPosition()!;

      const scaleBy = CANVAS_CONFIG.ZOOM.WHEEL_SENSITIVITY;
      const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      this.stage.scale({ x: newScale, y: newScale });
      this.zoomLevel = newScale;

      const newPos = {
        x: pointer.x - (pointer.x - this.stage.x()) * newScale / oldScale,
        y: pointer.y - (pointer.y - this.stage.y()) * newScale / oldScale,
      };

      this.stage.position(newPos);
      this.layer.batchDraw();
    });
  }

  private addSelectionHandling(): void {
    this.stage.on('click', (e) => {
      console.log('🖱️ Canvas clicked, target:', e.target.constructor.name);

      if (e.target === this.stage) {
        console.log('🔄 Clicked on stage - clearing selection');
        this.clearSelection();
        return;
      }

      if (e.target instanceof Konva.Shape || e.target instanceof Konva.Group) {
        console.log('🎯 Clicked on shape - selecting');
        this.selectShape(e.target as Konva.Shape);
      }
    });
  }

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

  getZoomPercentage(): number {
    return Math.round(this.zoomLevel * 100);
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
}