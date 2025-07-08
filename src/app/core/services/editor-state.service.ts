import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import {
    EditorState,
    CanvasState,
    ViewportState,
    ZoomState,
    PanState,
    InteractionState,
    MultiSelectionState,
    PerformanceState,
    CanvasHistoryState,
    CanvasSettings,
    EditorConfig,
    CanvasCursor,
    CanvasMode,
    CanvasTool,
    CanvasGesture,
    CanvasEventData,
    CanvasOperationResult,
    Point
} from '@core/models';
import { CANVAS_CONFIG } from '@core/constants/canvas.constants';
import { MathUtils } from '@shared/utils/math.utils';

@Injectable({
    providedIn: 'root'
})
export class EditorStateService {

    // === PRIVATE STATE SUBJECTS ===

    private _isInitialized$ = new BehaviorSubject<boolean>(false);
    private _canvas$ = new BehaviorSubject<CanvasState>(this.createInitialCanvasState());
    private _viewport$ = new BehaviorSubject<ViewportState>(this.createInitialViewportState());
    private _zoom$ = new BehaviorSubject<ZoomState>(this.createInitialZoomState());
    private _pan$ = new BehaviorSubject<PanState>(this.createInitialPanState());
    private _interaction$ = new BehaviorSubject<InteractionState>(this.createInitialInteractionState());
    private _multiSelection$ = new BehaviorSubject<MultiSelectionState>(this.createInitialMultiSelectionState());
    private _performance$ = new BehaviorSubject<PerformanceState>(this.createInitialPerformanceState());
    private _history$ = new BehaviorSubject<CanvasHistoryState>(this.createInitialHistoryState());
    private _settings$ = new BehaviorSubject<CanvasSettings>(this.createInitialCanvasSettings());
    private _config$ = new BehaviorSubject<EditorConfig>(this.createInitialEditorConfig());
    private _cursor$ = new BehaviorSubject<CanvasCursor>(CanvasCursor.DEFAULT);

    // === PUBLIC OBSERVABLES ===

    /** Editor initialization state */
    public readonly isInitialized$ = this._isInitialized$.asObservable();

    /** Canvas state observable */
    public readonly canvasState$ = this._canvas$.asObservable();

    /** Viewport state observable */
    public readonly viewportState$ = this._viewport$.asObservable();

    /** Zoom state observable */
    public readonly zoomState$ = this._zoom$.asObservable();

    /** Pan state observable */
    public readonly panState$ = this._pan$.asObservable();

    /** Interaction state observable */
    public readonly interactionState$ = this._interaction$.asObservable();

    /** Multi-selection state observable */
    public readonly multiSelectionState$ = this._multiSelection$.asObservable();

    /** Performance state observable */
    public readonly performanceState$ = this._performance$.asObservable();

    /** History state observable */
    public readonly historyState$ = this._history$.asObservable();

    /** Canvas settings observable */
    public readonly canvasSettings$ = this._settings$.asObservable();

    /** Editor configuration observable */
    public readonly editorConfig$ = this._config$.asObservable();

    /** Current cursor observable */
    public readonly cursor$ = this._cursor$.asObservable();

    // === COMPUTED OBSERVABLES ===

    /** Combined editor state */
    public readonly editorState$: Observable<EditorState> = combineLatest([
        this._canvas$,
        this._viewport$,
        this._zoom$,
        this._pan$,
        this._interaction$,
        this._multiSelection$,
        this._performance$,
        this._history$,
        this._settings$,
        this._config$,
        this._cursor$,
        this._isInitialized$
    ]).pipe(
        map(([canvas, viewport, zoom, pan, interaction, multiSelection, performance, history, settings, config, cursor, isInitialized]) => ({
            canvas,
            viewport,
            zoom,
            pan,
            interaction,
            multiSelection,
            performance,
            history,
            settings,
            config,
            cursor,
            isInitialized,
            lastUpdate: new Date()
        } as EditorState))
    );

    /** Zoom level as percentage */
    public readonly zoomPercentage$ = this._zoom$.pipe(
        map(zoom => Math.round(zoom.level * 100))
    );

    /** Can zoom in */
    public readonly canZoomIn$ = this._zoom$.pipe(
        map(zoom => zoom.level < zoom.constraints.max)
    );

    /** Can zoom out */
    public readonly canZoomOut$ = this._zoom$.pipe(
        map(zoom => zoom.level > zoom.constraints.min)
    );

    /** Has selection */
    public readonly hasSelection$ = this._canvas$.pipe(
        map(canvas => canvas.selectedDeviceIds.length > 0 || canvas.selectedConnectionIds.length > 0)
    );

    /** Selection count */
    public readonly selectionCount$ = this._canvas$.pipe(
        map(canvas => canvas.selectedDeviceIds.length + canvas.selectedConnectionIds.length)
    );

    /** Is multi-selecting */
    public readonly isMultiSelecting$ = this._multiSelection$.pipe(
        map(multiSelection => multiSelection.isActive)
    );

    /** Can undo */
    public readonly canUndo$ = this._history$.pipe(
        map(history => history.canUndo)
    );

    /** Can redo */
    public readonly canRedo$ = this._history$.pipe(
        map(history => history.canRedo)
    );

    /** Current mode */
    public readonly currentMode$ = this._interaction$.pipe(
        map(interaction => interaction.mode)
    );

    /** Current tool */
    public readonly currentTool$ = this._interaction$.pipe(
        map(interaction => interaction.tool)
    );

    /** Is performance mode active */
    public readonly isPerformanceMode$ = this._performance$.pipe(
        map(performance => performance.isPerformanceMode)
    );

    /** Current FPS */
    public readonly currentFPS$ = this._performance$.pipe(
        map(performance => performance.fps)
    );

    // === INITIALIZATION ===

    /**
     * Initialize editor with viewport dimensions
     */
    public initializeEditor(width: number, height: number): CanvasOperationResult {
        try {
            console.log('🎯 EditorStateService: Initializing editor', { width, height });

            // Update viewport state
            const viewport: ViewportState = {
                width,
                height,
                centerX: width / 2,
                centerY: height / 2,
                minZoom: CANVAS_CONFIG.ZOOM.MIN,
                maxZoom: CANVAS_CONFIG.ZOOM.MAX
            };

            this._viewport$.next(viewport);
            this._isInitialized$.next(true);

            console.log('✅ EditorStateService: Editor initialized successfully');

            return {
                success: true,
                message: 'Editor initialized successfully',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to initialize editor', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to initialize editor',
                timestamp: new Date()
            };
        }
    }

    /**
     * Reset editor to initial state
     */
    public resetEditor(): CanvasOperationResult {
        try {
            console.log('🔄 EditorStateService: Resetting editor state');

            this._canvas$.next(this.createInitialCanvasState());
            this._zoom$.next(this.createInitialZoomState());
            this._pan$.next(this.createInitialPanState());
            this._interaction$.next(this.createInitialInteractionState());
            this._multiSelection$.next(this.createInitialMultiSelectionState());
            this._performance$.next(this.createInitialPerformanceState());
            this._history$.next(this.createInitialHistoryState());
            this._cursor$.next(CanvasCursor.DEFAULT);

            console.log('✅ EditorStateService: Editor reset successfully');

            return {
                success: true,
                message: 'Editor reset successfully',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to reset editor', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to reset editor',
                timestamp: new Date()
            };
        }
    }

    // === ZOOM MANAGEMENT ===

    /**
     * Set zoom level
     */
    public setZoom(level: number, centerPoint?: Point): CanvasOperationResult {
        try {
            const currentZoom = this._zoom$.value;
            const clampedLevel = MathUtils.clamp(level, currentZoom.constraints.min, currentZoom.constraints.max);

            const updatedZoom: ZoomState = {
                ...currentZoom,
                level: clampedLevel,
                centerPoint: centerPoint || currentZoom.centerPoint,
                isZooming: false
            };

            this._zoom$.next(updatedZoom);

            console.log(`🔍 EditorStateService: Zoom set to ${Math.round(clampedLevel * 100)}%`);

            return {
                success: true,
                message: `Zoom set to ${Math.round(clampedLevel * 100)}%`,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to set zoom', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to set zoom',
                timestamp: new Date()
            };
        }
    }

    /**
     * Zoom in by step
     */
    public zoomIn(centerPoint?: Point): CanvasOperationResult {
        const currentZoom = this._zoom$.value;
        const newLevel = currentZoom.level * CANVAS_CONFIG.ZOOM.WHEEL_SENSITIVITY;
        return this.setZoom(newLevel, centerPoint);
    }

    /**
     * Zoom out by step
     */
    public zoomOut(centerPoint?: Point): CanvasOperationResult {
        const currentZoom = this._zoom$.value;
        const newLevel = currentZoom.level / CANVAS_CONFIG.ZOOM.WHEEL_SENSITIVITY;
        return this.setZoom(newLevel, centerPoint);
    }

    /**
     * Reset zoom to 100%
     */
    public resetZoom(): CanvasOperationResult {
        const viewport = this._viewport$.value;
        const centerPoint: Point = {
            x: viewport.centerX,
            y: viewport.centerY
        };
        return this.setZoom(1.0, centerPoint);
    }

    /**
     * Fit zoom to screen
     */
    public fitToScreen(): CanvasOperationResult {
        try {
            const viewport = this._viewport$.value;
            const zoom = this._zoom$.value;

            // Calculate optimal zoom level to fit content
            // This is a simplified version - can be enhanced based on actual content bounds
            const fitLevel = Math.min(viewport.width / 1000, viewport.height / 600);
            const clampedLevel = MathUtils.clamp(fitLevel, zoom.constraints.min, zoom.constraints.max);

            const updatedZoom: ZoomState = {
                ...zoom,
                level: clampedLevel,
                centerPoint: { x: viewport.centerX, y: viewport.centerY },
                fitToScreen: true
            };

            this._zoom$.next(updatedZoom);

            console.log(`📏 EditorStateService: Fit to screen - zoom set to ${Math.round(clampedLevel * 100)}%`);

            return {
                success: true,
                message: `Fit to screen - zoom set to ${Math.round(clampedLevel * 100)}%`,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to fit to screen', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to fit to screen',
                timestamp: new Date()
            };
        }
    }

    // === PAN MANAGEMENT ===

    /**
     * Set pan position
     */
    public setPan(position: Point): CanvasOperationResult {
        try {
            const currentPan = this._pan$.value;

            // Apply constraints if they exist
            let constrainedPosition = position;
            if (currentPan.constraints) {
                constrainedPosition = {
                    x: MathUtils.clamp(position.x, currentPan.constraints.minX, currentPan.constraints.maxX),
                    y: MathUtils.clamp(position.y, currentPan.constraints.minY, currentPan.constraints.maxY)
                };
            }

            const updatedPan: PanState = {
                ...currentPan,
                position: constrainedPosition,
                isPanning: false
            };

            this._pan$.next(updatedPan);

            console.log(`🖐️ EditorStateService: Pan set to (${constrainedPosition.x}, ${constrainedPosition.y})`);

            return {
                success: true,
                message: `Pan updated`,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to set pan', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to set pan',
                timestamp: new Date()
            };
        }
    }

    /**
     * Start pan operation
     */
    public startPan(startPosition: Point): CanvasOperationResult {
        try {
            const currentPan = this._pan$.value;

            const updatedPan: PanState = {
                ...currentPan,
                isPanning: true,
                startPosition
            };

            this._pan$.next(updatedPan);

            console.log('🖐️ EditorStateService: Pan started');

            return {
                success: true,
                message: 'Pan started',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to start pan', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to start pan',
                timestamp: new Date()
            };
        }
    }

    /**
     * End pan operation
     */
    public endPan(): CanvasOperationResult {
        try {
            const currentPan = this._pan$.value;

            const updatedPan: PanState = {
                ...currentPan,
                isPanning: false,
                startPosition: undefined
            };

            this._pan$.next(updatedPan);

            console.log('🖐️ EditorStateService: Pan ended');

            return {
                success: true,
                message: 'Pan ended',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to end pan', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to end pan',
                timestamp: new Date()
            };
        }
    }

    /**
     * Center viewport on point
     */
    public centerOn(point: Point): CanvasOperationResult {
        const viewport = this._viewport$.value;
        const centerPosition: Point = {
            x: viewport.centerX - point.x,
            y: viewport.centerY - point.y
        };
        return this.setPan(centerPosition);
    }

    // === MODE AND TOOL MANAGEMENT ===

    /**
     * Set canvas mode
     */
    public setMode(mode: CanvasMode): CanvasOperationResult {
        try {
            const currentInteraction = this._interaction$.value;

            const updatedInteraction: InteractionState = {
                ...currentInteraction,
                mode
            };

            this._interaction$.next(updatedInteraction);

            // Update cursor based on mode
            this.updateCursorForMode(mode);

            console.log(`🔧 EditorStateService: Mode set to ${mode}`);

            return {
                success: true,
                message: `Mode set to ${mode}`,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to set mode', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to set mode',
                timestamp: new Date()
            };
        }
    }

    /**
     * Set canvas tool
     */
    public setTool(tool: CanvasTool): CanvasOperationResult {
        try {
            const currentInteraction = this._interaction$.value;

            const updatedInteraction: InteractionState = {
                ...currentInteraction,
                tool
            };

            this._interaction$.next(updatedInteraction);

            // Update cursor based on tool
            this.updateCursorForTool(tool);

            console.log(`🛠️ EditorStateService: Tool set to ${tool}`);

            return {
                success: true,
                message: `Tool set to ${tool}`,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to set tool', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to set tool',
                timestamp: new Date()
            };
        }
    }

    /**
     * Toggle between select and pan modes
     */
    public toggleSelectPanMode(): CanvasOperationResult {
        const currentMode = this._interaction$.value.mode;
        const newMode = currentMode === CanvasMode.SELECT ? CanvasMode.PAN : CanvasMode.SELECT;
        return this.setMode(newMode);
    }

    // === HELPER METHODS ===

    /**
     * Get current editor state snapshot
     */
    public getCurrentState(): EditorState {
        return {
            canvas: this._canvas$.value,
            viewport: this._viewport$.value,
            zoom: this._zoom$.value,
            pan: this._pan$.value,
            interaction: this._interaction$.value,
            multiSelection: this._multiSelection$.value,
            performance: this._performance$.value,
            history: this._history$.value,
            settings: this._settings$.value,
            config: this._config$.value,
            cursor: this._cursor$.value,
            isInitialized: this._isInitialized$.value,
            lastUpdate: new Date()
        };
    }

    /**
     * Update cursor based on mode
     */
    private updateCursorForMode(mode: CanvasMode): void {
        let cursor: CanvasCursor;

        switch (mode) {
            case CanvasMode.SELECT:
                cursor = CanvasCursor.DEFAULT;
                break;
            case CanvasMode.PAN:
                cursor = CanvasCursor.GRAB;
                break;
            case CanvasMode.CONNECT:
                cursor = CanvasCursor.CROSSHAIR;
                break;
            case CanvasMode.ANNOTATE:
                cursor = CanvasCursor.TEXT;
                break;
            default:
                cursor = CanvasCursor.DEFAULT;
        }

        this._cursor$.next(cursor);
    }

    /**
     * Update cursor based on tool
     */
    private updateCursorForTool(tool: CanvasTool): void {
        let cursor: CanvasCursor;

        switch (tool) {
            case CanvasTool.SELECT:
                cursor = CanvasCursor.DEFAULT;
                break;
            case CanvasTool.PAN:
            case CanvasTool.HAND:
                cursor = CanvasCursor.GRAB;
                break;
            case CanvasTool.ZOOM:
                cursor = CanvasCursor.ZOOM_IN;
                break;
            case CanvasTool.CONNECTION:
            case CanvasTool.LINE:
                cursor = CanvasCursor.CROSSHAIR;
                break;
            case CanvasTool.TEXT:
                cursor = CanvasCursor.TEXT;
                break;
            case CanvasTool.RECTANGLE:
            case CanvasTool.CIRCLE:
                cursor = CanvasCursor.CROSSHAIR;
                break;
            default:
                cursor = CanvasCursor.DEFAULT;
        }

        this._cursor$.next(cursor);
    }

    // === INITIAL STATE CREATORS ===

    private createInitialCanvasState(): CanvasState {
        return {
            zoom: CANVAS_CONFIG.ZOOM.DEFAULT,
            panX: 0,
            panY: 0,
            selectedDeviceIds: [],
            selectedConnectionIds: [],
            isDragging: false,
            isConnecting: false
        };
    }

    private createInitialViewportState(): ViewportState {
        return {
            width: 800,
            height: 600,
            centerX: 400,
            centerY: 300,
            minZoom: CANVAS_CONFIG.ZOOM.MIN,
            maxZoom: CANVAS_CONFIG.ZOOM.MAX
        };
    }

    private createInitialZoomState(): ZoomState {
        return {
            level: CANVAS_CONFIG.ZOOM.DEFAULT,
            centerPoint: { x: 400, y: 300 },
            isZooming: false,
            fitToScreen: false,
            constraints: {
                min: CANVAS_CONFIG.ZOOM.MIN,
                max: CANVAS_CONFIG.ZOOM.MAX,
                step: CANVAS_CONFIG.ZOOM.STEP
            }
        };
    }

    private createInitialPanState(): PanState {
        return {
            position: { x: 0, y: 0 },
            isPanning: false
        };
    }

    private createInitialInteractionState(): InteractionState {
        return {
            mode: CanvasMode.SELECT,
            tool: CanvasTool.SELECT,
            isMouseDown: false,
            lastClickTime: 0,
            doubleClickThreshold: 300,
            modifier: {
                ctrl: false,
                shift: false,
                alt: false
            }
        };
    }

    private createInitialMultiSelectionState(): MultiSelectionState {
        return {
            isActive: false,
            selectedItems: {
                deviceIds: [],
                connectionIds: [],
                annotationIds: []
            },
            mode: 'replace'
        };
    }

    private createInitialPerformanceState(): PerformanceState {
        return {
            fps: 60,
            renderTime: 0,
            objectCount: 0,
            isPerformanceMode: false,
            lastFrameTime: 0,
            renderOptimizations: {
                useLayerCaching: true,
                skipInvisibleObjects: true,
                batchUpdates: true
            }
        };
    }

    private createInitialHistoryState(): CanvasHistoryState {
        return {
            canUndo: false,
            canRedo: false,
            currentIndex: 0,
            maxHistorySize: 50,
            isRecording: true
        };
    }

    private createInitialCanvasSettings(): CanvasSettings {
        return {
            gridSize: CANVAS_CONFIG.GRID.SIZE,
            showGrid: true,
            snapToGrid: true,
            snapDistance: CANVAS_CONFIG.SNAP.DISTANCE,
            showRulers: false,
            backgroundColor: '#ffffff',
            gridColor: CANVAS_CONFIG.GRID.COLOR
        };
    }

    private createInitialEditorConfig(): EditorConfig {
        return {
            viewport: {
                defaultZoom: CANVAS_CONFIG.ZOOM.DEFAULT,
                minZoom: CANVAS_CONFIG.ZOOM.MIN,
                maxZoom: CANVAS_CONFIG.ZOOM.MAX,
                zoomStep: CANVAS_CONFIG.ZOOM.STEP,
                wheelSensitivity: CANVAS_CONFIG.ZOOM.WHEEL_SENSITIVITY
            },
            grid: {
                size: CANVAS_CONFIG.GRID.SIZE,
                color: CANVAS_CONFIG.GRID.COLOR,
                opacity: CANVAS_CONFIG.GRID.OPACITY,
                visible: true
            },
            snapping: {
                enabled: CANVAS_CONFIG.SNAP.ENABLED,
                distance: CANVAS_CONFIG.SNAP.DISTANCE,
                snapToGrid: true,
                snapToObjects: true,
                snapToGuides: false
            },
            selection: {
                color: CANVAS_CONFIG.SELECTION.COLOR,
                strokeWidth: CANVAS_CONFIG.SELECTION.STROKE_WIDTH,
                cornerRadius: 4,
                multiSelectKey: 'ctrl'
            },
            performance: {
                maxVisibleObjects: CANVAS_CONFIG.PERFORMANCE.MAX_VISIBLE_OBJECTS,
                throttleMs: CANVAS_CONFIG.PERFORMANCE.THROTTLE_MS,
                useOffscreenCanvas: false
            }
        };
    }
}