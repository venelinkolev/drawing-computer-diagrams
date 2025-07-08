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


/**
 * Zoom management state and configuration
 */
export interface ZoomState {
    level: number;
    centerPoint: Point;
    isZooming: boolean;
    fitToScreen: boolean;
    constraints: {
        min: number;
        max: number;
        step: number;
    };
}

/**
 * Pan/drag state management
 */
export interface PanState {
    position: Point;
    isPanning: boolean;
    startPosition?: Point;
    constraints?: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
}

/**
 * Multi-selection management
 */
export interface MultiSelectionState {
    isActive: boolean;
    startPoint?: Point;
    currentBounds?: SelectionBox;
    selectedItems: {
        deviceIds: string[];
        connectionIds: string[];
        annotationIds: string[];
    };
    mode: 'add' | 'subtract' | 'replace';
}

/**
 * Canvas interaction states
 */
export interface InteractionState {
    mode: CanvasMode;
    tool: CanvasTool;
    isMouseDown: boolean;
    lastClickTime: number;
    doubleClickThreshold: number;
    activeGesture?: CanvasGesture;
    modifier: {
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
    };
}

/**
 * Available canvas tools
 */
export enum CanvasTool {
    SELECT = 'select',
    PAN = 'pan',
    ZOOM = 'zoom',
    HAND = 'hand',
    CONNECTION = 'connection',
    TEXT = 'text',
    RECTANGLE = 'rectangle',
    CIRCLE = 'circle',
    LINE = 'line'
}

/**
 * Canvas gestures for interaction
 */
export enum CanvasGesture {
    NONE = 'none',
    DRAG = 'drag',
    ZOOM = 'zoom',
    PAN = 'pan',
    SELECT = 'select',
    DRAW = 'draw',
    RESIZE = 'resize',
    ROTATE = 'rotate'
}

/**
 * Canvas performance monitoring
 */
export interface PerformanceState {
    fps: number;
    renderTime: number;
    objectCount: number;
    isPerformanceMode: boolean;
    lastFrameTime: number;
    renderOptimizations: {
        useLayerCaching: boolean;
        skipInvisibleObjects: boolean;
        batchUpdates: boolean;
    };
}

/**
 * Canvas history state for undo/redo
 */
export interface CanvasHistoryState {
    canUndo: boolean;
    canRedo: boolean;
    currentIndex: number;
    maxHistorySize: number;
    isRecording: boolean;
}

/**
 * Canvas editor configuration
 */
export interface EditorConfig {
    viewport: {
        defaultZoom: number;
        minZoom: number;
        maxZoom: number;
        zoomStep: number;
        wheelSensitivity: number;
    };
    grid: {
        size: number;
        color: string;
        opacity: number;
        visible: boolean;
    };
    snapping: {
        enabled: boolean;
        distance: number;
        snapToGrid: boolean;
        snapToObjects: boolean;
        snapToGuides: boolean;
    };
    selection: {
        color: string;
        strokeWidth: number;
        cornerRadius: number;
        multiSelectKey: 'ctrl' | 'shift';
    };
    performance: {
        maxVisibleObjects: number;
        throttleMs: number;
        useOffscreenCanvas: boolean;
    };
}

/**
 * Canvas cursor states
 */
export enum CanvasCursor {
    DEFAULT = 'default',
    POINTER = 'pointer',
    GRAB = 'grab',
    GRABBING = 'grabbing',
    CROSSHAIR = 'crosshair',
    MOVE = 'move',
    RESIZE_NS = 'ns-resize',
    RESIZE_EW = 'ew-resize',
    RESIZE_NWSE = 'nwse-resize',
    RESIZE_NESW = 'nesw-resize',
    TEXT = 'text',
    NOT_ALLOWED = 'not-allowed',
    ZOOM_IN = 'zoom-in',
    ZOOM_OUT = 'zoom-out'
}

/**
 * Canvas event data structure
 */
export interface CanvasEventData {
    type: CanvasEventType;
    position: Point;
    target?: any;
    modifiers: {
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
    };
    timestamp: number;
    originalEvent?: Event;
}

/**
 * Canvas event types
 */
export enum CanvasEventType {
    CLICK = 'click',
    DOUBLE_CLICK = 'dblclick',
    MOUSE_DOWN = 'mousedown',
    MOUSE_UP = 'mouseup',
    MOUSE_MOVE = 'mousemove',
    MOUSE_ENTER = 'mouseenter',
    MOUSE_LEAVE = 'mouseleave',
    WHEEL = 'wheel',
    KEY_DOWN = 'keydown',
    KEY_UP = 'keyup',
    DRAG_START = 'dragstart',
    DRAG_END = 'dragend',
    SELECTION_CHANGE = 'selectionchange',
    ZOOM_CHANGE = 'zoomchange',
    PAN_CHANGE = 'panchange'
}

/**
 * Complete editor state combining all aspects
 */
export interface EditorState {
    canvas: CanvasState;
    viewport: ViewportState;
    zoom: ZoomState;
    pan: PanState;
    interaction: InteractionState;
    multiSelection: MultiSelectionState;
    performance: PerformanceState;
    history: CanvasHistoryState;
    settings: CanvasSettings;
    config: EditorConfig;
    cursor: CanvasCursor;
    isInitialized: boolean;
    lastUpdate: Date;
}

/**
 * Canvas operation result for state updates
 */
export interface CanvasOperationResult {
    success: boolean;
    message?: string;
    error?: Error;
    updatedState?: Partial<EditorState>;
    timestamp: Date;
}