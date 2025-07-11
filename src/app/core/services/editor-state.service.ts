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

    // === ENHANCED PAN MANAGEMENT ===

    /**
     * Set pan position with undo/redo support
     */
    public setPanWithHistory(
        position: Point,
        description: string = 'Pan canvas',
        undoRedoService?: any
    ): CanvasOperationResult {
        try {
            const currentPan = this._pan$.value;
            const previousPosition = { ...currentPan.position };

            // Apply constraints if they exist
            let constrainedPosition = position;
            if (currentPan.constraints) {
                constrainedPosition = {
                    x: MathUtils.clamp(position.x, currentPan.constraints.minX, currentPan.constraints.maxX),
                    y: MathUtils.clamp(position.y, currentPan.constraints.minY, currentPan.constraints.maxY)
                };
            }

            // Create undo/redo command if service provided
            if (undoRedoService && !this.isPositionEqual(previousPosition, constrainedPosition)) {
                const panCommand = undoRedoService.createPanCommand(
                    constrainedPosition,
                    previousPosition,
                    this
                );
                undoRedoService.executeCommand(panCommand);
            } else {
                // Direct update without undo/redo
                this.setPan(constrainedPosition);
            }

            console.log(`🖐️ EditorStateService: Pan with history to (${constrainedPosition.x}, ${constrainedPosition.y})`);

            return {
                success: true,
                message: `Pan updated`,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to set pan with history', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to set pan with history',
                timestamp: new Date()
            };
        }
    }
    /**
     * Start drag-to-pan operation
     */
    public startDragPan(startPosition: Point): CanvasOperationResult {
        try {
            const currentPan = this._pan$.value;
            const currentInteraction = this._interaction$.value;

            const updatedPan: PanState = {
                ...currentPan,
                isPanning: true,
                startPosition
            };

            const updatedInteraction: InteractionState = {
                ...currentInteraction,
                activeGesture: CanvasGesture.PAN,
                isMouseDown: true
            };

            this._pan$.next(updatedPan);
            this._interaction$.next(updatedInteraction);
            this._cursor$.next(CanvasCursor.GRABBING);

            console.log('🖐️ EditorStateService: Drag pan started at', startPosition);

            return {
                success: true,
                message: 'Drag pan started',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to start drag pan', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to start drag pan',
                timestamp: new Date()
            };
        }
    }

    /**
     * Update drag-to-pan during mouse move
     */
    public updateDragPan(currentPosition: Point): CanvasOperationResult {
        try {
            const panState = this._pan$.value;

            if (!panState.isPanning || !panState.startPosition) {
                return { success: false, message: 'Drag pan not active', timestamp: new Date() };
            }

            const deltaX = currentPosition.x - panState.startPosition.x;
            const deltaY = currentPosition.y - panState.startPosition.y;

            const newPosition: Point = {
                x: panState.position.x + deltaX,
                y: panState.position.y + deltaY
            };

            // Apply constraints if they exist
            let constrainedPosition = newPosition;
            if (panState.constraints) {
                constrainedPosition = {
                    x: MathUtils.clamp(newPosition.x, panState.constraints.minX, panState.constraints.maxX),
                    y: MathUtils.clamp(newPosition.y, panState.constraints.minY, panState.constraints.maxY)
                };
            }

            const updatedPan: PanState = {
                ...panState,
                position: constrainedPosition,
                startPosition: currentPosition // Update start position for smooth dragging
            };

            this._pan$.next(updatedPan);

            return {
                success: true,
                message: 'Drag pan updated',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to update drag pan', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to update drag pan',
                timestamp: new Date()
            };
        }
    }

    /**
     * End drag-to-pan operation with undo/redo support
     */
    public endDragPan(
        finalPosition: Point,
        originalPosition: Point,
        undoRedoService?: any
    ): CanvasOperationResult {
        try {
            const currentPan = this._pan$.value;
            const currentInteraction = this._interaction$.value;

            const updatedPan: PanState = {
                ...currentPan,
                isPanning: false,
                startPosition: undefined
            };

            const updatedInteraction: InteractionState = {
                ...currentInteraction,
                activeGesture: CanvasGesture.NONE,
                isMouseDown: false
            };

            this._pan$.next(updatedPan);
            this._interaction$.next(updatedInteraction);

            // Update cursor based on current mode
            this.updateCursorForMode(currentInteraction.mode);

            // Create undo/redo command if service provided and position changed significantly
            if (undoRedoService && !this.isPositionEqual(originalPosition, finalPosition)) {
                const panCommand = undoRedoService.createPanCommand(
                    finalPosition,
                    originalPosition,
                    this
                );
                undoRedoService.executeCommand(panCommand);
            }

            console.log('🖐️ EditorStateService: Drag pan ended');

            return {
                success: true,
                message: 'Drag pan ended',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to end drag pan', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to end drag pan',
                timestamp: new Date()
            };
        }
    }

    /**
     * Set pan constraints (boundary limits)
     */
    public setPanConstraints(constraints: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    }): CanvasOperationResult {
        try {
            const currentPan = this._pan$.value;

            const updatedPan: PanState = {
                ...currentPan,
                constraints
            };

            this._pan$.next(updatedPan);

            console.log('🔒 EditorStateService: Pan constraints set', constraints);

            return {
                success: true,
                message: 'Pan constraints set',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to set pan constraints', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to set pan constraints',
                timestamp: new Date()
            };
        }
    }

    /**
     * Clear pan constraints
     */
    public clearPanConstraints(): CanvasOperationResult {
        try {
            const currentPan = this._pan$.value;

            const updatedPan: PanState = {
                ...currentPan,
                constraints: undefined
            };

            this._pan$.next(updatedPan);

            console.log('🔓 EditorStateService: Pan constraints cleared');

            return {
                success: true,
                message: 'Pan constraints cleared',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ EditorStateService: Failed to clear pan constraints', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to clear pan constraints',
                timestamp: new Date()
            };
        }
    }

    /**
     * Animate pan to position
     */
    /**
  * Animate pan to position with Konva stage sync
  */
    /**
  * Animate pan to position with Konva stage sync
  */
    public animatePanTo(
        targetPosition: Point,
        duration: number = 300,
        easing: 'linear' | 'easeInOut' = 'easeInOut',
        konvaStage?: any,
        konvaLayer?: any
    ): Promise<CanvasOperationResult> {
        return new Promise((resolve) => {
            try {
                const currentPan = this._pan$.value;
                const startPosition = { ...currentPan.position };
                const startTime = performance.now();

                console.log(`🎬 Starting pan animation from (${startPosition.x}, ${startPosition.y}) to (${targetPosition.x}, ${targetPosition.y})`);

                const animate = (currentTime: number) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    // Apply easing
                    let easedProgress = progress;
                    if (easing === 'easeInOut') {
                        easedProgress = progress < 0.5
                            ? 2 * progress * progress
                            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    }

                    const currentPosition: Point = {
                        x: startPosition.x + (targetPosition.x - startPosition.x) * easedProgress,
                        y: startPosition.y + (targetPosition.y - startPosition.y) * easedProgress
                    };

                    // Update EditorStateService (auto-sync ще обнови Konva за non-animation updates)
                    this.setPan(currentPosition);

                    // ➕ DIRECT UPDATE: За smooth animation все пак трябва direct Konva update
                    if (konvaStage && konvaLayer) {
                        konvaStage.position(currentPosition);
                        konvaLayer.batchDraw();
                    }

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        console.log('✅ EditorStateService: Pan animation completed');
                        resolve({
                            success: true,
                            message: 'Pan animation completed',
                            timestamp: new Date()
                        });
                    }
                };

                requestAnimationFrame(animate);

            } catch (error) {
                console.error('❌ EditorStateService: Failed to animate pan', error);
                resolve({
                    success: false,
                    error: error as Error,
                    message: 'Failed to animate pan',
                    timestamp: new Date()
                });
            }
        });
    }
    /**
     * Get optimal pan position to center content
     */
    public getOptimalPanPosition(contentBounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    }): Point {
        const viewport = this._viewport$.value;
        const zoom = this._zoom$.value;

        const contentWidth = contentBounds.maxX - contentBounds.minX;
        const contentHeight = contentBounds.maxY - contentBounds.minY;
        const contentCenterX = contentBounds.minX + contentWidth / 2;
        const contentCenterY = contentBounds.minY + contentHeight / 2;

        // Calculate position to center content in viewport
        const optimalX = (viewport.width / 2) - (contentCenterX * zoom.level);
        const optimalY = (viewport.height / 2) - (contentCenterY * zoom.level);

        return { x: optimalX, y: optimalY };
    }

    // === KEYBOARD SUPPORT ===

    /**
     * Handle keyboard shortcuts for pan operations
     */
    public handleKeyboardShortcut(
        key: string,
        modifiers: { ctrl: boolean; shift: boolean; alt: boolean }
    ): CanvasOperationResult {
        try {
            const currentInteraction = this._interaction$.value;

            switch (key.toLowerCase()) {
                case 'space':
                    if (currentInteraction.mode !== CanvasMode.PAN) {
                        return this.setMode(CanvasMode.PAN);
                    }
                    break;

                case 'escape':
                    if (currentInteraction.mode === CanvasMode.PAN) {
                        return this.setMode(CanvasMode.SELECT);
                    }
                    // Reset pan position on Escape
                    return this.setPan({ x: 0, y: 0 });

                case 'home':
                    // Center and reset zoom
                    this.resetZoom();
                    return this.setPan({ x: 0, y: 0 });

                case 'arrowup':
                    if (modifiers.shift) {
                        const currentPan = this._pan$.value;
                        const step = modifiers.ctrl ? 50 : 10;
                        return this.setPan({ x: currentPan.position.x, y: currentPan.position.y - step });
                    }
                    break;

                case 'arrowdown':
                    if (modifiers.shift) {
                        const currentPan = this._pan$.value;
                        const step = modifiers.ctrl ? 50 : 10;
                        return this.setPan({ x: currentPan.position.x, y: currentPan.position.y + step });
                    }
                    break;

                case 'arrowleft':
                    if (modifiers.shift) {
                        const currentPan = this._pan$.value;
                        const step = modifiers.ctrl ? 50 : 10;
                        return this.setPan({ x: currentPan.position.x - step, y: currentPan.position.y });
                    }
                    break;

                case 'arrowright':
                    if (modifiers.shift) {
                        const currentPan = this._pan$.value;
                        const step = modifiers.ctrl ? 50 : 10;
                        return this.setPan({ x: currentPan.position.x + step, y: currentPan.position.y });
                    }
                    break;
            }

            return {
                success: false,
                message: 'Keyboard shortcut not recognized',
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ EditorStateService: Failed to handle keyboard shortcut', error);
            return {
                success: false,
                error: error as Error,
                message: 'Failed to handle keyboard shortcut',
                timestamp: new Date()
            };
        }
    }

    // === HELPER METHODS ===

    /**
     * Check if two positions are equal (with small tolerance)
     */
    private isPositionEqual(pos1: Point, pos2: Point, tolerance: number = 1): boolean {
        return Math.abs(pos1.x - pos2.x) < tolerance && Math.abs(pos1.y - pos2.y) < tolerance;
    }

    /**
     * Get pan state information for debugging
     */
    public getPanDebugInfo(): {
        position: Point;
        isPanning: boolean;
        hasConstraints: boolean;
        constraints?: any;
        canPanUp: boolean;
        canPanDown: boolean;
        canPanLeft: boolean;
        canPanRight: boolean;
    } {
        const panState = this._pan$.value;

        let canPanUp = true, canPanDown = true, canPanLeft = true, canPanRight = true;

        if (panState.constraints) {
            canPanUp = panState.position.y > panState.constraints.minY;
            canPanDown = panState.position.y < panState.constraints.maxY;
            canPanLeft = panState.position.x > panState.constraints.minX;
            canPanRight = panState.position.x < panState.constraints.maxX;
        }

        return {
            position: { ...panState.position },
            isPanning: panState.isPanning,
            hasConstraints: !!panState.constraints,
            constraints: panState.constraints,
            canPanUp,
            canPanDown,
            canPanLeft,
            canPanRight
        };
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