import { Point } from './device.model';

export interface CanvasState {
    zoom: number;
    panX: number;
    panY: number;
    selectedDeviceIds: string[];
    selectedConnectionIds: string[];
    selectionBox?: SelectionBox;
    isDragging: boolean;
    isConnecting: boolean;
    connectionStart?: {
        deviceId: string;
        portId?: string;
        position: Point;
    };
}

export interface SelectionBox {
    startPoint: Point;
    endPoint: Point;
    isVisible: boolean;
}

export interface ViewportState {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    minZoom: number;
    maxZoom: number;
}

export enum CanvasMode {
    SELECT = 'select',
    PAN = 'pan',
    CONNECT = 'connect',
    ANNOTATE = 'annotate'
}

export interface CanvasSettings {
    gridSize: number;
    showGrid: boolean;
    snapToGrid: boolean;
    snapDistance: number;
    showRulers: boolean;
    backgroundColor: string;
    gridColor: string;
}