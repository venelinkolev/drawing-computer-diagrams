import { Device, Point } from './device.model';
import { Connection } from './connection.model';
import { Annotation } from './project.model';

/**
 * Base command interface for undo/redo operations
 */
export interface Command {
    id: string;
    type: CommandType;
    description: string;
    timestamp: Date;
    canExecute(): boolean;
    execute(): Promise<CommandResult> | CommandResult;
    undo(): Promise<CommandResult> | CommandResult;
    redo(): Promise<CommandResult> | CommandResult;
}

/**
 * Command execution result
 */
export interface CommandResult {
    success: boolean;
    message?: string;
    error?: Error;
    data?: any;
}

/**
 * Available command types
 */
export enum CommandType {
    // Device commands
    ADD_DEVICE = 'add_device',
    REMOVE_DEVICE = 'remove_device',
    UPDATE_DEVICE = 'update_device',
    MOVE_DEVICE = 'move_device',

    // Connection commands
    ADD_CONNECTION = 'add_connection',
    REMOVE_CONNECTION = 'remove_connection',
    UPDATE_CONNECTION = 'update_connection',

    // Annotation commands
    ADD_ANNOTATION = 'add_annotation',
    REMOVE_ANNOTATION = 'remove_annotation',
    UPDATE_ANNOTATION = 'update_annotation',

    // Canvas commands
    ZOOM_CHANGE = 'zoom_change',
    PAN_CHANGE = 'pan_change',

    // Project commands
    UPDATE_PROJECT_METADATA = 'update_project_metadata',
    UPDATE_PROJECT_SETTINGS = 'update_project_settings',

    // Batch commands
    BATCH_OPERATION = 'batch_operation',

    // Selection commands
    SELECT_ITEMS = 'select_items',
    CLEAR_SELECTION = 'clear_selection'
}

/**
 * Command group for batching multiple operations
 */
export interface BatchCommand extends Command {
    commands: Command[];
}

/**
 * Device-specific command data
 */
export interface DeviceCommandData {
    deviceId: string;
    device?: Device;
    previousDevice?: Device;
    position?: Point;
    previousPosition?: Point;
    updates?: Partial<Device>;
}

/**
 * Connection-specific command data
 */
export interface ConnectionCommandData {
    connectionId: string;
    connection?: Connection;
    previousConnection?: Connection;
    updates?: Partial<Connection>;
}

/**
 * Annotation-specific command data
 */
export interface AnnotationCommandData {
    annotationId: string;
    annotation?: Annotation;
    previousAnnotation?: Annotation;
    updates?: Partial<Annotation>;
}

/**
 * Canvas-specific command data
 */
export interface CanvasCommandData {
    zoomLevel?: number;
    previousZoomLevel?: number;
    panPosition?: Point;
    previousPanPosition?: Point;
    centerPoint?: Point;
}

/**
 * Selection-specific command data
 */
export interface SelectionCommandData {
    deviceIds: string[];
    connectionIds: string[];
    annotationIds: string[];
    previousDeviceIds?: string[];
    previousConnectionIds?: string[];
    previousAnnotationIds?: string[];
}

/**
 * History state for undo/redo management
 */
export interface HistoryState {
    commands: Command[];
    currentIndex: number;
    maxSize: number;
    canUndo: boolean;
    canRedo: boolean;
    isRecording: boolean;
}

/**
 * Undo/Redo service configuration
 */
export interface UndoRedoConfig {
    maxHistorySize: number;
    enableBatching: boolean;
    batchTimeoutMs: number;
    enableCompression: boolean;
    persistHistory: boolean;
    debugLogging: boolean;
}

/**
 * Command factory interface for creating specific commands
 */
export interface CommandFactory {
    createAddDeviceCommand(device: Device): Command;
    createRemoveDeviceCommand(deviceId: string, device: Device): Command;
    createMoveDeviceCommand(deviceId: string, newPosition: Point, previousPosition: Point): Command;
    createUpdateDeviceCommand(deviceId: string, updates: Partial<Device>, previousDevice: Device): Command;

    createAddConnectionCommand(connection: Connection): Command;
    createRemoveConnectionCommand(connectionId: string, connection: Connection): Command;
    createUpdateConnectionCommand(connectionId: string, updates: Partial<Connection>, previousConnection: Connection): Command;

    createAddAnnotationCommand(annotation: Annotation): Command;
    createRemoveAnnotationCommand(annotationId: string, annotation: Annotation): Command;
    createUpdateAnnotationCommand(annotationId: string, updates: Partial<Annotation>, previousAnnotation: Annotation): Command;

    createZoomCommand(newZoom: number, previousZoom: number, centerPoint?: Point): Command;
    createPanCommand(newPosition: Point, previousPosition: Point): Command;

    createBatchCommand(commands: Command[], description: string): BatchCommand;
}

/**
 * Command execution context for dependency injection
 */
export interface CommandContext {
    projectStateService: any;  // Will be properly typed when we integrate
    editorStateService: any;   // Will be properly typed when we integrate
    timestamp: Date;
    userId?: string;
    sessionId?: string;
}

/**
 * Serializable command data for persistence
 */
export interface SerializableCommand {
    id: string;
    type: CommandType;
    description: string;
    timestamp: string;
    data: any;
}

/**
 * Command validation result
 */
export interface CommandValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Event emitted when commands are executed
 */
export interface CommandEvent {
    type: 'execute' | 'undo' | 'redo' | 'batch_start' | 'batch_end';
    command: Command;
    result: CommandResult;
    timestamp: Date;
}

/**
 * Performance metrics for command execution
 */
export interface CommandMetrics {
    executionTimeMs: number;
    memoryUsage?: number;
    commandType: CommandType;
    timestamp: Date;
}

// === SPECIFIC COMMAND IMPLEMENTATIONS ===

/**
 * Add device command
 */
export interface AddDeviceCommand extends Command {
    type: CommandType.ADD_DEVICE;
    data: DeviceCommandData;
}

/**
 * Remove device command
 */
export interface RemoveDeviceCommand extends Command {
    type: CommandType.REMOVE_DEVICE;
    data: DeviceCommandData;
}

/**
 * Move device command
 */
export interface MoveDeviceCommand extends Command {
    type: CommandType.MOVE_DEVICE;
    data: DeviceCommandData;
}

/**
 * Update device command
 */
export interface UpdateDeviceCommand extends Command {
    type: CommandType.UPDATE_DEVICE;
    data: DeviceCommandData;
}

/**
 * Zoom change command
 */
export interface ZoomCommand extends Command {
    type: CommandType.ZOOM_CHANGE;
    data: CanvasCommandData;
}

/**
 * Pan change command
 */
export interface PanCommand extends Command {
    type: CommandType.PAN_CHANGE;
    data: CanvasCommandData;
}

/**
 * Selection change command
 */
export interface SelectionCommand extends Command {
    type: CommandType.SELECT_ITEMS | CommandType.CLEAR_SELECTION;
    data: SelectionCommandData;
}