import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, map } from 'rxjs';

import {
    Command,
    CommandResult,
    CommandType,
    HistoryState,
    UndoRedoConfig,
    CommandEvent,
    CommandMetrics,
    BatchCommand,
    DeviceCommandData,
    ConnectionCommandData,
    AnnotationCommandData,
    CanvasCommandData,
    SelectionCommandData
} from '@core/models/command.model';
import { Device, Point, Connection, Annotation } from '@core/models';
import { IdUtils } from '@shared/utils';

@Injectable({
    providedIn: 'root'
})
export class UndoRedoService {

    // === PRIVATE STATE SUBJECTS ===

    private _history$ = new BehaviorSubject<Command[]>([]);
    private _currentIndex$ = new BehaviorSubject<number>(-1);
    private _isRecording$ = new BehaviorSubject<boolean>(true);
    private _isBatching$ = new BehaviorSubject<boolean>(false);
    private _batchCommands$ = new BehaviorSubject<Command[]>([]);
    private _config$ = new BehaviorSubject<UndoRedoConfig>(this.getDefaultConfig());

    // === EVENTS ===
    private _commandEvents$ = new Subject<CommandEvent>();
    private _commandMetrics$ = new Subject<CommandMetrics>();

    // === PUBLIC OBSERVABLES ===

    /** Command history observable */
    public readonly history$ = this._history$.asObservable();

    /** Current index in history */
    public readonly currentIndex$ = this._currentIndex$.asObservable();

    /** Is recording commands */
    public readonly isRecording$ = this._isRecording$.asObservable();

    /** Is currently batching commands */
    public readonly isBatching$ = this._isBatching$.asObservable();

    /** Current batch commands */
    public readonly batchCommands$ = this._batchCommands$.asObservable();

    /** Service configuration */
    public readonly config$ = this._config$.asObservable();

    /** Command events stream */
    public readonly commandEvents$ = this._commandEvents$.asObservable();

    /** Command performance metrics */
    public readonly commandMetrics$ = this._commandMetrics$.asObservable();

    // === COMPUTED OBSERVABLES ===

    /** Can perform undo */
    public readonly canUndo$: Observable<boolean> = new BehaviorSubject(false);

    /** Can perform redo */
    public readonly canRedo$: Observable<boolean> = new BehaviorSubject(false);

    /** Current history state */
    public readonly historyState$: Observable<HistoryState> = new BehaviorSubject({
        commands: [],
        currentIndex: -1,
        maxSize: 50,
        canUndo: false,
        canRedo: false,
        isRecording: true
    });

    /** History size */
    public readonly historySize$: Observable<number> = this._history$.pipe(
        map(history => history.length)
    );

    // === PRIVATE PROPERTIES ===
    private batchTimeout?: number;
    private readonly maxHistorySize = 50;

    constructor() {
        this.initializeComputedObservables();
        console.log('🎯 UndoRedoService: Service initialized');
    }

    // === CORE COMMAND OPERATIONS ===

    /**
 * Execute a command and add it to history
 */
    public async executeCommand(command: Command): Promise<CommandResult> {
        if (!this._isRecording$.value) {
            console.log('⏸️ UndoRedoService: Recording disabled, skipping command');
            return { success: false, message: 'Recording disabled' };
        }

        try {
            const startTime = performance.now();

            // Validate command
            if (!command.canExecute()) {
                return {
                    success: false,
                    message: `Command ${command.type} cannot be executed`
                };
            }

            // ➕ ПОПРАВЕНА ЛОГИКА: Винаги изпълнявай командата
            console.log(`🎬 UndoRedoService: Executing command ${command.type}:`, command.description);
            const result = await Promise.resolve(command.execute());

            if (result.success) {
                // Add to history or batch СЛЕД изпълнение
                if (!this._isBatching$.value) {
                    this.addToHistory(command);
                    console.log(`📚 UndoRedoService: Command added to history`);
                } else {
                    this.addToBatch(command);
                    console.log(`📦 UndoRedoService: Command added to batch`);
                }

                // Emit event
                this._commandEvents$.next({
                    type: 'execute',
                    command,
                    result,
                    timestamp: new Date()
                });

                // Record metrics
                const executionTime = performance.now() - startTime;
                this._commandMetrics$.next({
                    executionTimeMs: executionTime,
                    commandType: command.type,
                    timestamp: new Date()
                });

                console.log(`✅ UndoRedoService: Command executed successfully in ${executionTime.toFixed(2)}ms`);
            } else {
                console.error('❌ UndoRedoService: Command execution failed:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ UndoRedoService: Command execution error:', error);
            return {
                success: false,
                error: error as Error,
                message: 'Command execution failed'
            };
        }
    }

    /**
     * Undo the last command
     */
    public async undo(): Promise<CommandResult> {
        const currentIndex = this._currentIndex$.value;
        const history = this._history$.value;

        if (currentIndex < 0 || currentIndex >= history.length) {
            return { success: false, message: 'No command to undo' };
        }

        try {
            const command = history[currentIndex];
            console.log(`↩️ UndoRedoService: Undoing command ${command.type}:`, command.description);

            const result = await Promise.resolve(command.undo());

            if (result.success) {
                this._currentIndex$.next(currentIndex - 1);
                this.updateComputedObservables();

                this._commandEvents$.next({
                    type: 'undo',
                    command,
                    result,
                    timestamp: new Date()
                });

                console.log('✅ UndoRedoService: Command undone successfully');
            } else {
                console.error('❌ UndoRedoService: Undo failed:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ UndoRedoService: Undo error:', error);
            return {
                success: false,
                error: error as Error,
                message: 'Undo operation failed'
            };
        }
    }

    /**
     * Redo the next command
     */
    public async redo(): Promise<CommandResult> {
        const currentIndex = this._currentIndex$.value;
        const history = this._history$.value;

        if (currentIndex >= history.length - 1) {
            return { success: false, message: 'No command to redo' };
        }

        try {
            const nextIndex = currentIndex + 1;
            const command = history[nextIndex];
            console.log(`↪️ UndoRedoService: Redoing command ${command.type}:`, command.description);

            const result = await Promise.resolve(command.redo());

            if (result.success) {
                this._currentIndex$.next(nextIndex);
                this.updateComputedObservables();

                this._commandEvents$.next({
                    type: 'redo',
                    command,
                    result,
                    timestamp: new Date()
                });

                console.log('✅ UndoRedoService: Command redone successfully');
            } else {
                console.error('❌ UndoRedoService: Redo failed:', result.error);
            }

            return result;

        } catch (error) {
            console.error('❌ UndoRedoService: Redo error:', error);
            return {
                success: false,
                error: error as Error,
                message: 'Redo operation failed'
            };
        }
    }

    // === BATCH OPERATIONS ===

    /**
     * Start batch operation
     */
    public startBatch(description: string = 'Batch operation'): void {
        console.log('📦 UndoRedoService: Starting batch operation:', description);
        this._isBatching$.next(true);
        this._batchCommands$.next([]);

        this._commandEvents$.next({
            type: 'batch_start',
            command: this.createBatchPlaceholder(description),
            result: { success: true },
            timestamp: new Date()
        });
    }

    /**
     * End batch operation and add to history as single command
     */
    public endBatch(description?: string): void {
        const batchCommands = this._batchCommands$.value;

        if (batchCommands.length === 0) {
            console.log('📦 UndoRedoService: Empty batch, canceling');
            this._isBatching$.next(false);
            return;
        }

        const batchCommand = this.createBatchCommand(
            batchCommands,
            description || `Batch operation (${batchCommands.length} commands)`
        );

        console.log(`📦 UndoRedoService: Ending batch with ${batchCommands.length} commands`);
        this.addToHistory(batchCommand);

        this._isBatching$.next(false);
        this._batchCommands$.next([]);

        this._commandEvents$.next({
            type: 'batch_end',
            command: batchCommand,
            result: { success: true },
            timestamp: new Date()
        });
    }

    /**
     * Cancel current batch operation
     */
    public cancelBatch(): void {
        console.log('🚫 UndoRedoService: Canceling batch operation');
        this._isBatching$.next(false);
        this._batchCommands$.next([]);
    }

    // === HISTORY MANAGEMENT ===

    /**
     * Clear command history
     */
    public clearHistory(): void {
        console.log('🧹 UndoRedoService: Clearing command history');
        this._history$.next([]);
        this._currentIndex$.next(-1);
        this.updateComputedObservables();
    }

    /**
     * Set recording state
     */
    public setRecording(enabled: boolean): void {
        console.log(`🎬 UndoRedoService: Recording ${enabled ? 'enabled' : 'disabled'}`);
        this._isRecording$.next(enabled);
    }

    /**
     * Get current history state snapshot
     */
    public getHistoryState(): HistoryState {
        const history = this._history$.value;
        const currentIndex = this._currentIndex$.value;
        const config = this._config$.value;

        return {
            commands: [...history],
            currentIndex,
            maxSize: config.maxHistorySize,
            canUndo: currentIndex >= 0,
            canRedo: currentIndex < history.length - 1,
            isRecording: this._isRecording$.value
        };
    }

    /**
     * Update service configuration
     */
    public updateConfig(config: Partial<UndoRedoConfig>): void {
        const currentConfig = this._config$.value;
        const newConfig = { ...currentConfig, ...config };
        this._config$.next(newConfig);
        console.log('⚙️ UndoRedoService: Configuration updated:', config);
    }

    // === COMMAND FACTORY METHODS ===

    /**
     * Create add device command
     */
    public createAddDeviceCommand(
        device: Device,
        projectStateService: any
    ): Command {
        const data: DeviceCommandData = {
            deviceId: device.id,
            device
        };

        return {
            id: IdUtils.generateUUID(),
            type: CommandType.ADD_DEVICE,
            description: `Add ${device.type} device: ${device.metadata.name}`,
            timestamp: new Date(),

            canExecute: () => true,

            execute: () => {
                projectStateService.addDevice(device);
                return { success: true, message: 'Device added' };
            },

            undo: () => {
                projectStateService.removeDevice(device.id);
                return { success: true, message: 'Device removed' };
            },

            redo: () => {
                projectStateService.addDevice(device);
                return { success: true, message: 'Device re-added' };
            }
        };
    }

    /**
     * Create remove device command
     */
    public createRemoveDeviceCommand(
        deviceId: string,
        device: Device,
        projectStateService: any
    ): Command {
        const data: DeviceCommandData = {
            deviceId,
            device
        };

        return {
            id: IdUtils.generateUUID(),
            type: CommandType.REMOVE_DEVICE,
            description: `Remove ${device.type} device: ${device.metadata.name}`,
            timestamp: new Date(),

            canExecute: () => true,

            execute: () => {
                projectStateService.removeDevice(deviceId);
                return { success: true, message: 'Device removed' };
            },

            undo: () => {
                projectStateService.addDevice(device);
                return { success: true, message: 'Device restored' };
            },

            redo: () => {
                projectStateService.removeDevice(deviceId);
                return { success: true, message: 'Device removed again' };
            }
        };
    }

    /**
     * Create move device command
     */
    public createMoveDeviceCommand(
        deviceId: string,
        newPosition: Point,
        previousPosition: Point,
        projectStateService: any
    ): Command {
        const data: DeviceCommandData = {
            deviceId,
            position: newPosition,
            previousPosition
        };

        return {
            id: IdUtils.generateUUID(),
            type: CommandType.MOVE_DEVICE,
            description: `Move device to (${newPosition.x}, ${newPosition.y})`,
            timestamp: new Date(),

            canExecute: () => true,

            execute: () => {
                projectStateService.updateDevice(deviceId, { position: newPosition });
                return { success: true, message: 'Device moved' };
            },

            undo: () => {
                projectStateService.updateDevice(deviceId, { position: previousPosition });
                return { success: true, message: 'Device move undone' };
            },

            redo: () => {
                projectStateService.updateDevice(deviceId, { position: newPosition });
                return { success: true, message: 'Device moved again' };
            }
        };
    }

    /**
     * Create zoom command
     */
    public createZoomCommand(
        newZoom: number,
        previousZoom: number,
        centerPoint: Point,
        editorStateService: any
    ): Command {
        const data: CanvasCommandData = {
            zoomLevel: newZoom,
            previousZoomLevel: previousZoom,
            centerPoint
        };

        return {
            id: IdUtils.generateUUID(),
            type: CommandType.ZOOM_CHANGE,
            description: `Zoom to ${Math.round(newZoom * 100)}%`,
            timestamp: new Date(),

            canExecute: () => true,

            execute: () => {
                editorStateService.setZoom(newZoom, centerPoint);
                return { success: true, message: 'Zoom applied' };
            },

            undo: () => {
                editorStateService.setZoom(previousZoom, centerPoint);
                return { success: true, message: 'Zoom undone' };
            },

            redo: () => {
                editorStateService.setZoom(newZoom, centerPoint);
                return { success: true, message: 'Zoom reapplied' };
            }
        };
    }

    /**
     * Create pan command
     */
    /**
 * Create pan command with Konva stage sync
 */
    /**
 * Create pan command (simplified - auto-sync handles Konva updates)
 */
    public createPanCommand(
        newPosition: Point,
        previousPosition: Point,
        editorStateService: any
    ): Command {
        const data: CanvasCommandData = {
            panPosition: newPosition,
            previousPanPosition: previousPosition
        };

        return {
            id: IdUtils.generateUUID(),
            type: CommandType.PAN_CHANGE,
            description: `Pan to (${Math.round(newPosition.x)}, ${Math.round(newPosition.y)})`,
            timestamp: new Date(),

            canExecute: () => true,

            execute: () => {
                editorStateService.setPan(newPosition);
                // Auto-sync will handle Konva stage update
                return { success: true, message: 'Pan applied' };
            },

            undo: () => {
                editorStateService.setPan(previousPosition);
                // Auto-sync will handle Konva stage update
                return { success: true, message: 'Pan undone' };
            },

            redo: () => {
                editorStateService.setPan(newPosition);
                // Auto-sync will handle Konva stage update
                return { success: true, message: 'Pan reapplied' };
            }
        };
    }

    // === PRIVATE HELPER METHODS ===

    private addToHistory(command: Command): void {
        const history = this._history$.value;
        const currentIndex = this._currentIndex$.value;
        const config = this._config$.value;

        // Remove any commands after current index (when undoing then adding new command)
        const newHistory = history.slice(0, currentIndex + 1);

        // Add new command
        newHistory.push(command);

        // Limit history size
        if (newHistory.length > config.maxHistorySize) {
            newHistory.shift();
        } else {
            this._currentIndex$.next(currentIndex + 1);
        }

        this._history$.next(newHistory);
        this.updateComputedObservables();
    }

    private addToBatch(command: Command): void {
        const batchCommands = this._batchCommands$.value;
        this._batchCommands$.next([...batchCommands, command]);
    }

    private createBatchCommand(commands: Command[], description: string): BatchCommand {
        return {
            id: IdUtils.generateUUID(),
            type: CommandType.BATCH_OPERATION,
            description,
            timestamp: new Date(),
            commands,

            canExecute: () => commands.every(cmd => cmd.canExecute()),

            execute: async () => {
                for (const cmd of commands) {
                    const result = await Promise.resolve(cmd.execute());
                    if (!result.success) {
                        return result;
                    }
                }
                return { success: true, message: 'Batch executed' };
            },

            undo: async () => {
                // Undo in reverse order
                for (let i = commands.length - 1; i >= 0; i--) {
                    const result = await Promise.resolve(commands[i].undo());
                    if (!result.success) {
                        return result;
                    }
                }
                return { success: true, message: 'Batch undone' };
            },

            redo: async () => {
                for (const cmd of commands) {
                    const result = await Promise.resolve(cmd.redo());
                    if (!result.success) {
                        return result;
                    }
                }
                return { success: true, message: 'Batch redone' };
            }
        };
    }

    private createBatchPlaceholder(description: string): Command {
        return {
            id: IdUtils.generateUUID(),
            type: CommandType.BATCH_OPERATION,
            description,
            timestamp: new Date(),
            canExecute: () => false,
            execute: () => ({ success: false }),
            undo: () => ({ success: false }),
            redo: () => ({ success: false })
        };
    }

    private initializeComputedObservables(): void {
        // Set up reactive computed observables
        this._history$.subscribe(() => this.updateComputedObservables());
        this._currentIndex$.subscribe(() => this.updateComputedObservables());
    }

    private updateComputedObservables(): void {
        const history = this._history$.value;
        const currentIndex = this._currentIndex$.value;
        const config = this._config$.value;

        const canUndo = currentIndex >= 0;
        const canRedo = currentIndex < history.length - 1;

        (this.canUndo$ as BehaviorSubject<boolean>).next(canUndo);
        (this.canRedo$ as BehaviorSubject<boolean>).next(canRedo);

        const historyState: HistoryState = {
            commands: [...history],
            currentIndex,
            maxSize: config.maxHistorySize,
            canUndo,
            canRedo,
            isRecording: this._isRecording$.value
        };

        (this.historyState$ as BehaviorSubject<HistoryState>).next(historyState);
    }

    private getDefaultConfig(): UndoRedoConfig {
        return {
            maxHistorySize: 50,
            enableBatching: true,
            batchTimeoutMs: 1000,
            enableCompression: false,
            persistHistory: false,
            debugLogging: true
        };
    }
}