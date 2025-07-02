import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

// Pure Konva.js import
import Konva from 'konva';

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
  ],
  template: `
    <mat-toolbar color="primary">
      <mat-icon>account_tree</mat-icon>
      <span style="margin-left: 8px;">Network Diagram Editor</span>
      
      <span style="flex: 1;"></span>
      
      <button mat-icon-button (click)="addDevice()">
        <mat-icon>add_circle</mat-icon>
      </button>
    </mat-toolbar>

    <div style="display: flex; height: calc(100vh - 64px);">
      
      <!-- Left Sidebar -->
      <div style="width: 280px; background: var(--surface-color); border-right: 1px solid var(--border-color); padding: 16px;">
        <h3 style="margin-top: 0; color: var(--text-primary);">Device Library</h3>
        
        <mat-card style="margin-bottom: 16px;">
          <mat-card-header>
            <mat-card-title>Network Devices</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button mat-raised-button color="primary" (click)="addDevice('router')">
                🔀 Add Router
              </button>
              <button mat-raised-button color="primary" (click)="addDevice('switch')">
                🔗 Add Switch
              </button>
              <button mat-raised-button color="primary" (click)="addDevice('server')">
                🖥️ Add Server
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Test Actions</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button mat-raised-button color="accent" (click)="addConnection()">
                ➡️ Add Connection
              </button>
              <button mat-stroked-button color="warn" (click)="clearCanvas()">
                🗑️ Clear All
              </button>
              <button mat-stroked-button (click)="exportCanvas()">
                💾 Export PNG
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Canvas Area -->
      <div style="flex: 1; background: var(--canvas-background); position: relative; overflow: hidden;">
        
        <!-- Canvas Instructions -->
        <div style="position: absolute; top: 20px; left: 20px; z-index: 10;">
          <mat-card style="padding: 16px;">
            <h4 style="margin: 0 0 8px 0;">✅ Pure Konva.js Canvas</h4>
            <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">
              Drag devices • Right-click for context menu • Zoom with mouse wheel
            </p>
          </mat-card>
        </div>

        <!-- Konva Canvas Container -->
        <div #canvasContainer style="width: 100%; height: 100%;"></div>
      </div>

      <!-- Right Properties Panel -->
      <div style="width: 280px; background: var(--surface-color); border-left: 1px solid var(--border-color); padding: 16px;">
        <h3 style="margin-top: 0; color: var(--text-primary);">Properties</h3>
        
        <mat-card>
          <mat-card-header>
            <mat-card-title>Canvas Stats</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
              <div>Devices: {{ deviceCount }}</div>
              <div>Connections: {{ connectionCount }}</div>
              <div>Selected: {{ selectedObject || 'None' }}</div>
              <div>Zoom: {{ getZoomPercentage() }}%</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card style="margin-top: 16px;" *ngIf="selectedObject">
          <mat-card-header>
            <mat-card-title>Selected Object</mat-card-title>
          </mat-card-header>
          <mat-card-content style="margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
              <div><strong>Type:</strong> {{ selectedObject }}</div>
              <div><strong>Position:</strong> ({{ selectedX }}, {{ selectedY }})</div>
              <button mat-stroked-button color="warn" (click)="deleteSelected()" style="margin-top: 8px;">
                Delete Selected
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
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef;

  title = 'network-diagram-editor';

  // Konva objects
  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private selectedShape: Konva.Shape | null = null;

  // Component state
  deviceCount = 0;
  connectionCount = 0;
  selectedObject: string | null = null;
  selectedX = 0;
  selectedY = 0;
  zoomLevel = 1;

  ngAfterViewInit(): void {
    this.initializeCanvas();
  }

  ngOnDestroy(): void {
    if (this.stage) {
      this.stage.destroy();
    }
  }

  private initializeCanvas(): void {
    const container = this.canvasContainer.nativeElement;

    // Create Konva stage
    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
      draggable: false,
    });

    // Create main layer
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // Add grid background
    this.drawGrid();

    // Add zoom functionality
    this.addZoomSupport();

    // Add selection handling
    this.addSelectionHandling();

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  private drawGrid(): void {
    const gridSize = 20;
    const width = this.stage.width();
    const height = this.stage.height();

    // Vertical lines
    for (let i = 0; i < width / gridSize; i++) {
      const line = new Konva.Line({
        points: [i * gridSize, 0, i * gridSize, height],
        stroke: '#e8e8e8',
        strokeWidth: 1,
      });
      this.layer.add(line);
    }

    // Horizontal lines
    for (let i = 0; i < height / gridSize; i++) {
      const line = new Konva.Line({
        points: [0, i * gridSize, width, i * gridSize],
        stroke: '#e8e8e8',
        strokeWidth: 1,
      });
      this.layer.add(line);
    }
  }

  private addZoomSupport(): void {
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();

      const oldScale = this.stage.scaleX();
      const pointer = this.stage.getPointerPosition()!;

      const scaleBy = 1.1;
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
      if (e.target === this.stage) {
        this.clearSelection();
        return;
      }

      // Type guard: check if target is a Shape (not Stage)
      if (e.target instanceof Konva.Shape || e.target instanceof Konva.Group) {
        this.selectShape(e.target as Konva.Shape);
      }
    });
  }

  private selectShape(shape: Konva.Shape): void {
    this.clearSelection();

    this.selectedShape = shape;
    this.selectedObject = shape.getAttr('deviceType') || 'Unknown';
    this.selectedX = Math.round(shape.x());
    this.selectedY = Math.round(shape.y());

    // Add selection border
    shape.stroke('#2196f3');
    shape.strokeWidth(3);
    this.layer.batchDraw();
  }

  private clearSelection(): void {
    if (this.selectedShape) {
      this.selectedShape.stroke('#333');
      this.selectedShape.strokeWidth(2);
      this.layer.batchDraw();
    }

    this.selectedShape = null;
    this.selectedObject = null;
  }

  getZoomPercentage(): number {
    return Math.round(this.zoomLevel * 100);
  }

  addDevice(type: string = 'router'): void {
    const colors = {
      router: '#FF6B6B',
      switch: '#4ECDC4',
      server: '#45B7D1',
    };

    const device = new Konva.Rect({
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      width: 80,
      height: 60,
      fill: colors[type as keyof typeof colors] || '#96CEB4',
      stroke: '#333',
      strokeWidth: 2,
      draggable: true,
      deviceType: type,
    });

    // Add device label
    const label = new Konva.Text({
      x: device.x() + 10,
      y: device.y() + 20,
      text: type.toUpperCase(),
      fontSize: 12,
      fontFamily: 'Inter',
      fill: '#fff',
      listening: false,
    });

    // Group device and label
    const group = new Konva.Group({
      draggable: true,
      deviceType: type,
    });

    group.add(device);
    group.add(label);

    // Sync label position with device
    group.on('dragmove', () => {
      label.position({
        x: device.x() + 10,
        y: device.y() + 20,
      });
    });

    this.layer.add(group);
    this.layer.batchDraw();

    this.deviceCount++;
  }

  addConnection(): void {
    const line = new Konva.Line({
      points: [100, 200, 300, 200],
      stroke: '#757575',
      strokeWidth: 3,
      lineCap: 'round',
      draggable: true,
    });

    this.layer.add(line);
    this.layer.batchDraw();

    this.connectionCount++;
  }

  clearCanvas(): void {
    this.layer.destroyChildren();
    this.drawGrid();
    this.layer.batchDraw();

    this.deviceCount = 0;
    this.connectionCount = 0;
    this.clearSelection();
  }

  deleteSelected(): void {
    if (this.selectedShape) {
      this.selectedShape.destroy();
      this.layer.batchDraw();
      this.deviceCount--;
      this.clearSelection();
    }
  }

  exportCanvas(): void {
    const dataURL = this.stage.toDataURL({
      mimeType: 'image/png',
      quality: 1,
    });

    const link = document.createElement('a');
    link.download = 'network-diagram.png';
    link.href = dataURL;
    link.click();
  }

  private handleResize(): void {
    const container = this.canvasContainer.nativeElement;
    this.stage.size({
      width: container.offsetWidth,
      height: container.offsetHeight,
    });
    this.layer.batchDraw();
  }
}