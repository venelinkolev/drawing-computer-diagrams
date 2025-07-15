import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, Subject } from 'rxjs';

import {
    ConnectionServiceState,
    ConnectionDrawingState,
    ConnectionDrawingMode,
    ConnectionAnchor,
    AnchorDirection,
    ConnectionRoute,
    ConnectionSegment,
    ConnectionValidation,
    ConnectionTypeConfig,
    ConnectionSnapSettings,
    ConnectionRenderSettings,
    ConnectionCreationRequest,
    ConnectionCreationResult,
    ConnectionInteractionEvent,
    ConnectionEventType,
    ConnectionTemplate,
    ConnectionPattern,
    ConnectionAnalytics,
    BulkConnectionOperation,
    DEFAULT_CONNECTION_TYPES,
    DEFAULT_SNAP_SETTINGS,
    DEFAULT_RENDER_SETTINGS,
    DEFAULT_DRAWING_STATE
} from '@core/models/connection-service.model';
import { Connection, ConnectionType, ConnectionStyle } from '@core/models/connection.model';
import { Device, Point } from '@core/models/device.model';
import { IdUtils, MathUtils } from '@shared/utils';

@Injectable({
    providedIn: 'root'
})
export class ConnectionService {

    // === PRIVATE STATE SUBJECTS ===

    private _connections$ = new BehaviorSubject<Connection[]>([]);
    private _selectedConnections$ = new BehaviorSubject<Connection[]>([]);
    private _drawingState$ = new BehaviorSubject<ConnectionDrawingState>(DEFAULT_DRAWING_STATE);
    private _availableAnchors$ = new BehaviorSubject<ConnectionAnchor[]>([]);
    private _connectionTypes$ = new BehaviorSubject<ConnectionTypeConfig[]>(DEFAULT_CONNECTION_TYPES);
    private _drawingMode$ = new BehaviorSubject<ConnectionDrawingMode>(ConnectionDrawingMode.STRAIGHT);
    private _snapSettings$ = new BehaviorSubject<ConnectionSnapSettings>(DEFAULT_SNAP_SETTINGS);
    private _renderSettings$ = new BehaviorSubject<ConnectionRenderSettings>(DEFAULT_RENDER_SETTINGS);
    private _isEnabled$ = new BehaviorSubject<boolean>(false);

    // === EVENTS ===
    private _interactionEvents$ = new Subject<ConnectionInteractionEvent>();

    // === PUBLIC OBSERVABLES ===

    /** All connections */
    public readonly connections$ = this._connections$.asObservable();

    /** Selected connections */
    public readonly selectedConnections$ = this._selectedConnections$.asObservable();

    /** Current drawing state */
    public readonly drawingState$ = this._drawingState$.asObservable();

    /** Available connection anchors */
    public readonly availableAnchors$ = this._availableAnchors$.asObservable();

    /** Connection type configurations */
    public readonly connectionTypes$ = this._connectionTypes$.asObservable();

    /** Current drawing mode */
    public readonly drawingMode$ = this._drawingMode$.asObservable();

    /** Snap settings */
    public readonly snapSettings$ = this._snapSettings$.asObservable();

    /** Render settings */
    public readonly renderSettings$ = this._renderSettings$.asObservable();

    /** Service enabled state */
    public readonly isEnabled$ = this._isEnabled$.asObservable();

    /** Interaction events stream */
    public readonly interactionEvents$ = this._interactionEvents$.asObservable();

    // === COMPUTED OBSERVABLES ===

    /** Complete service state */
    public readonly serviceState$: Observable<ConnectionServiceState> = combineLatest([
        this._connections$,
        this._selectedConnections$,
        this._drawingState$,
        this._availableAnchors$,
        this._connectionTypes$,
        this._drawingMode$,
        this._snapSettings$,
        this._renderSettings$,
        this._isEnabled$
    ]).pipe(
        map(([connections, selectedConnections, drawingState, availableAnchors, connectionTypes, drawingMode, snapSettings, renderSettings, isEnabled]) => ({
            connections,
            selectedConnections,
            drawingState,
            availableAnchors,
            connectionTypes,
            drawingMode,
            snapSettings,
            renderSettings,
            isEnabled,
            lastUpdate: new Date()
        } as ConnectionServiceState))
    );

    /** Is currently drawing */
    public readonly isDrawing$ = this._drawingState$.pipe(
        map(state => state.isDrawing)
    );

    /** Connection count */
    public readonly connectionCount$ = this._connections$.pipe(
        map(connections => connections.length)
    );

    /** Selected connection count */
    public readonly selectedConnectionCount$ = this._selectedConnections$.pipe(
        map(connections => connections.length)
    );

    /** Has selection */
    public readonly hasSelection$ = this._selectedConnections$.pipe(
        map(connections => connections.length > 0)
    );

    /** Connections by type */
    public readonly connectionsByType$ = this._connections$.pipe(
        map(connections => {
            const grouped: Record<ConnectionType, Connection[]> = {} as any;
            Object.values(ConnectionType).forEach(type => {
                grouped[type] = connections.filter(c => c.type === type);
            });
            return grouped;
        })
    );

    /** Available connection anchors count */
    public readonly availableAnchorCount$ = this._availableAnchors$.pipe(
        map(anchors => anchors.filter(a => !a.isOccupied).length)
    );

    constructor() {
        this.initializeService();
        console.log('🎯 ConnectionService: Service initialized');
    }

    // === SERVICE LIFECYCLE ===

    /**
     * Enable connection service
     */
    public enable(): void {
        this._isEnabled$.next(true);
        console.log('🔗 ConnectionService: Service enabled');
    }

    /**
     * Disable connection service
     */
    public disable(): void {
        this._isEnabled$.next(false);
        this.cancelDrawing();
        console.log('🔗 ConnectionService: Service disabled');
    }

    /**
     * Reset service to initial state
     */
    public reset(): void {
        this._connections$.next([]);
        this._selectedConnections$.next([]);
        this._drawingState$.next(DEFAULT_DRAWING_STATE);
        this._availableAnchors$.next([]);
        this.disable();
        console.log('🔄 ConnectionService: Service reset');
    }

    // === CONNECTION MANAGEMENT ===

    /**
     * Set connections (called by ProjectStateService)
     */
    public setConnections(connections: Connection[]): void {
        this._connections$.next([...connections]);
        // Clear invalid selections
        const validSelections = this._selectedConnections$.value.filter(
            selected => connections.some(c => c.id === selected.id)
        );
        this._selectedConnections$.next(validSelections);
        console.log(`🔗 ConnectionService: ${connections.length} connections loaded`);
    }

    /**
     * Get connection by ID
     */
    public getConnection(id: string): Connection | null {
        return this._connections$.value.find(c => c.id === id) || null;
    }

    /**
     * Create connection from request
     */
    public createConnection(
        request: ConnectionCreationRequest,
        projectStateService?: any
    ): ConnectionCreationResult {
        try {
            console.log('🏗️ ConnectionService: Creating connection', request);

            // Validate request
            const validation = this.validateConnectionRequest(request);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.join(', '),
                    warnings: validation.warnings
                };
            }

            // Generate connection points
            const route = this.generateConnectionRoute(
                request.sourceDeviceId,
                request.targetDeviceId,
                request.customPoints
            );

            if (!route.isOptimal) {
                console.warn('⚠️ ConnectionService: Suboptimal route generated');
            }

            // Create connection object
            const connection: Connection = {
                id: IdUtils.generateUUID(),
                type: request.connectionType,
                sourceDeviceId: request.sourceDeviceId,
                targetDeviceId: request.targetDeviceId,
                sourcePortId: request.sourcePortId,
                targetPortId: request.targetPortId,
                points: route.points,
                metadata: {
                    name: request.metadata?.name,
                    description: request.metadata?.description,
                    bandwidth: request.metadata?.bandwidth,
                    protocol: request.metadata?.protocol,
                    tags: []
                },
                visualStyle: this.getDefaultStyleForType(request.connectionType),
                isSelected: false,
                layerIndex: this._renderSettings$.value.layerIndex,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Add to project via ProjectStateService if provided
            if (projectStateService) {
                projectStateService.addConnection(connection);
            }

            // Update anchors
            this.updateAnchorsAfterConnection(connection);

            this.emitInteractionEvent({
                type: ConnectionEventType.DRAWING_END,
                connection,
                timestamp: new Date()
            });

            console.log('✅ ConnectionService: Connection created successfully');

            return {
                success: true,
                connection,
                route,
                anchorsUsed: this.getAnchorsForConnection(connection)
            };

        } catch (error) {
            console.error('❌ ConnectionService: Failed to create connection', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Delete connection
     */
    public deleteConnection(
        connectionId: string,
        projectStateService?: any
    ): boolean {
        try {
            const connection = this.getConnection(connectionId);
            if (!connection) {
                console.warn('⚠️ ConnectionService: Connection not found for deletion');
                return false;
            }

            // Remove from project via ProjectStateService if provided
            if (projectStateService) {
                projectStateService.removeConnection(connectionId);
            }

            // Update anchors
            this.updateAnchorsAfterDisconnection(connection);

            // Remove from selection
            const selectedConnections = this._selectedConnections$.value;
            this._selectedConnections$.next(
                selectedConnections.filter(c => c.id !== connectionId)
            );

            console.log('✅ ConnectionService: Connection deleted successfully');
            return true;

        } catch (error) {
            console.error('❌ ConnectionService: Failed to delete connection', error);
            return false;
        }
    }

    // === DRAWING OPERATIONS ===

    /**
     * Start drawing connection
     */
    public startDrawing(
        startDevice: Device,
        startPoint: Point,
        connectionType: ConnectionType = ConnectionType.ETHERNET
    ): boolean {
        try {
            if (!this._isEnabled$.value) {
                console.warn('⚠️ ConnectionService: Service is disabled');
                return false;
            }

            const drawingState: ConnectionDrawingState = {
                isDrawing: true,
                startDevice,
                startPoint,
                currentPoint: startPoint,
                previewPoints: [startPoint],
                drawingMode: this._drawingMode$.value,
                snapDistance: this._snapSettings$.value.snapDistance,
                showSnapIndicators: this._snapSettings$.value.showSnapIndicators
            };

            this._drawingState$.next(drawingState);

            this.emitInteractionEvent({
                type: ConnectionEventType.DRAWING_START,
                position: startPoint,
                device: startDevice,
                timestamp: new Date()
            });

            console.log('🎨 ConnectionService: Drawing started', { device: startDevice.metadata.name, point: startPoint });
            return true;

        } catch (error) {
            console.error('❌ ConnectionService: Failed to start drawing', error);
            return false;
        }
    }

    /**
     * Update drawing preview
     */
    public updateDrawing(currentPoint: Point, snapTarget?: Device): void {
        try {
            const drawingState = this._drawingState$.value;
            if (!drawingState.isDrawing || !drawingState.startPoint) {
                return;
            }

            // Apply snapping if enabled
            const snappedPoint = this.applySnapping(currentPoint, snapTarget);

            // Generate preview route
            const previewPoints = this.generatePreviewRoute(
                drawingState.startPoint,
                snappedPoint,
                drawingState.drawingMode
            );

            const updatedState: ConnectionDrawingState = {
                ...drawingState,
                currentPoint: snappedPoint,
                endDevice: snapTarget,
                endPoint: snapTarget ? this.getDeviceConnectionPoint(snapTarget, snappedPoint) : snappedPoint,
                previewPoints
            };

            this._drawingState$.next(updatedState);

            this.emitInteractionEvent({
                type: ConnectionEventType.DRAWING_UPDATE,
                position: snappedPoint,
                device: snapTarget,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ ConnectionService: Failed to update drawing', error);
        }
    }

    /**
     * Finish drawing connection
     */
    public finishDrawing(
        endDevice: Device,
        endPoint: Point,
        connectionType: ConnectionType = ConnectionType.ETHERNET,
        projectStateService?: any
    ): ConnectionCreationResult {
        try {
            const drawingState = this._drawingState$.value;
            if (!drawingState.isDrawing || !drawingState.startDevice) {
                return {
                    success: false,
                    error: 'No active drawing session'
                };
            }

            // Create connection request
            const request: ConnectionCreationRequest = {
                sourceDeviceId: drawingState.startDevice.id,
                targetDeviceId: endDevice.id,
                connectionType,
                customPoints: drawingState.previewPoints,
                autoRoute: true
            };

            // Create the connection
            const result = this.createConnection(request, projectStateService);

            // Reset drawing state
            this._drawingState$.next(DEFAULT_DRAWING_STATE);

            console.log('🏁 ConnectionService: Drawing finished', {
                success: result.success,
                from: drawingState.startDevice.metadata.name,
                to: endDevice.metadata.name
            });

            return result;

        } catch (error) {
            console.error('❌ ConnectionService: Failed to finish drawing', error);
            this.cancelDrawing();
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Cancel current drawing
     */
    public cancelDrawing(): void {
        const drawingState = this._drawingState$.value;
        if (drawingState.isDrawing) {
            this._drawingState$.next(DEFAULT_DRAWING_STATE);

            this.emitInteractionEvent({
                type: ConnectionEventType.DRAWING_CANCEL,
                timestamp: new Date()
            });

            console.log('🚫 ConnectionService: Drawing cancelled');
        }
    }

    // === SELECTION MANAGEMENT ===

    /**
     * Select connection
     */
    public selectConnection(connectionId: string): boolean {
        try {
            const connection = this.getConnection(connectionId);
            if (!connection) return false;

            const selectedConnections = this._selectedConnections$.value;
            if (!selectedConnections.some(c => c.id === connectionId)) {
                this._selectedConnections$.next([...selectedConnections, connection]);

                this.emitInteractionEvent({
                    type: ConnectionEventType.CONNECTION_SELECT,
                    connection,
                    timestamp: new Date()
                });

                console.log('🎯 ConnectionService: Connection selected:', connectionId);
            }
            return true;

        } catch (error) {
            console.error('❌ ConnectionService: Failed to select connection', error);
            return false;
        }
    }

    /**
     * Deselect connection
     */
    public deselectConnection(connectionId: string): boolean {
        try {
            const selectedConnections = this._selectedConnections$.value;
            const filteredConnections = selectedConnections.filter(c => c.id !== connectionId);

            if (filteredConnections.length !== selectedConnections.length) {
                this._selectedConnections$.next(filteredConnections);

                this.emitInteractionEvent({
                    type: ConnectionEventType.CONNECTION_DESELECT,
                    timestamp: new Date()
                });

                console.log('🎯 ConnectionService: Connection deselected:', connectionId);
            }
            return true;

        } catch (error) {
            console.error('❌ ConnectionService: Failed to deselect connection', error);
            return false;
        }
    }

    /**
     * Clear all selections
     */
    public clearSelection(): void {
        this._selectedConnections$.next([]);
        console.log('🧹 ConnectionService: Selection cleared');
    }

    // === CONFIGURATION ===

    /**
     * Set drawing mode
     */
    public setDrawingMode(mode: ConnectionDrawingMode): void {
        this._drawingMode$.next(mode);
        console.log(`🎨 ConnectionService: Drawing mode set to ${mode}`);
    }

    /**
     * Update snap settings
     */
    public updateSnapSettings(settings: Partial<ConnectionSnapSettings>): void {
        const currentSettings = this._snapSettings$.value;
        const newSettings = { ...currentSettings, ...settings };
        this._snapSettings$.next(newSettings);
        console.log('⚙️ ConnectionService: Snap settings updated', settings);
    }

    /**
     * Update render settings
     */
    public updateRenderSettings(settings: Partial<ConnectionRenderSettings>): void {
        const currentSettings = this._renderSettings$.value;
        const newSettings = { ...currentSettings, ...settings };
        this._renderSettings$.next(newSettings);
        console.log('🎨 ConnectionService: Render settings updated', settings);
    }

    // === DEVICE INTEGRATION ===

    /**
     * Update available anchors from devices
     */
    public updateAnchorsFromDevices(devices: Device[]): void {
        const anchors: ConnectionAnchor[] = [];

        devices.forEach(device => {
            // Generate anchors for each device
            const deviceAnchors = this.generateDeviceAnchors(device);
            anchors.push(...deviceAnchors);
        });

        this._availableAnchors$.next(anchors);
        console.log(`🔗 ConnectionService: Updated ${anchors.length} anchors from ${devices.length} devices`);
    }

    // === ANALYTICS ===

    /**
     * Get connection analytics
     */
    public getAnalytics(): ConnectionAnalytics {
        const connections = this._connections$.value;

        const connectionsByType: Record<ConnectionType, number> = {} as any;
        Object.values(ConnectionType).forEach(type => {
            connectionsByType[type] = connections.filter(c => c.type === type).length;
        });

        const totalLength = connections.reduce((sum, conn) => {
            return sum + this.calculateConnectionLength(conn.points);
        }, 0);

        // Find most connected device
        const deviceConnections: Record<string, number> = {};
        connections.forEach(conn => {
            deviceConnections[conn.sourceDeviceId] = (deviceConnections[conn.sourceDeviceId] || 0) + 1;
            deviceConnections[conn.targetDeviceId] = (deviceConnections[conn.targetDeviceId] || 0) + 1;
        });

        const mostConnectedEntry = Object.entries(deviceConnections)
            .reduce((max, [deviceId, count]) => count > max[1] ? [deviceId, count] : max, ['', 0]);

        return {
            totalConnections: connections.length,
            connectionsByType,
            averageConnectionLength: connections.length > 0 ? totalLength / connections.length : 0,
            mostConnectedDevice: {
                deviceId: mostConnectedEntry[0],
                connectionCount: mostConnectedEntry[1]
            },
            connectionDensity: connections.length > 0 ? connections.length / Math.max(1, Object.keys(deviceConnections).length) : 0,
            topologyAnalysis: {
                hasLoops: this.detectLoops(connections),
                isolatedDevices: this.findIsolatedDevices(connections, Object.keys(deviceConnections)),
                redundantPaths: []
            }
        };
    }

    // === PRIVATE HELPER METHODS ===

    private initializeService(): void {
        // Service is disabled by default
        this._isEnabled$.next(false);
    }

    private validateConnectionRequest(request: ConnectionCreationRequest): ConnectionValidation {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        if (!request.sourceDeviceId) errors.push('Source device ID is required');
        if (!request.targetDeviceId) errors.push('Target device ID is required');
        if (request.sourceDeviceId === request.targetDeviceId) {
            errors.push('Cannot connect device to itself');
        }

        if (!Object.values(ConnectionType).includes(request.connectionType)) {
            errors.push('Invalid connection type');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
            autoFixAvailable: false
        };
    }

    private generateConnectionRoute(
        sourceDeviceId: string,
        targetDeviceId: string,
        customPoints?: Point[]
    ): ConnectionRoute {
        // Simplified routing - just return straight line for now
        // In real implementation, this would use pathfinding algorithms

        const points = customPoints || [];
        const totalLength = this.calculateConnectionLength(points);

        return {
            points,
            totalLength,
            segments: this.createSegmentsFromPoints(points),
            intersections: [],
            isOptimal: true
        };
    }

    private generatePreviewRoute(
        startPoint: Point,
        endPoint: Point,
        mode: ConnectionDrawingMode
    ): Point[] {
        switch (mode) {
            case ConnectionDrawingMode.STRAIGHT:
                return [startPoint, endPoint];

            case ConnectionDrawingMode.ORTHOGONAL:
                return this.generateOrthogonalRoute(startPoint, endPoint);

            case ConnectionDrawingMode.BEZIER:
                return this.generateBezierRoute(startPoint, endPoint);

            default:
                return [startPoint, endPoint];
        }
    }

    private generateOrthogonalRoute(start: Point, end: Point): Point[] {
        const midX = start.x + (end.x - start.x) / 2;
        return [
            start,
            { x: midX, y: start.y },
            { x: midX, y: end.y },
            end
        ];
    }

    private generateBezierRoute(start: Point, end: Point): Point[] {
        // Simplified bezier - return control points
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const ctrl1 = { x: start.x + dx * 0.3, y: start.y };
        const ctrl2 = { x: end.x - dx * 0.3, y: end.y };

        return [start, ctrl1, ctrl2, end];
    }

    private applySnapping(point: Point, snapTarget?: Device): Point {
        const snapSettings = this._snapSettings$.value;
        if (!snapSettings.enabled) return point;

        // Snap to device if available
        if (snapTarget && snapSettings.snapToDevices) {
            return this.getDeviceConnectionPoint(snapTarget, point);
        }

        // Could add grid snapping, other connection snapping, etc.
        return point;
    }

    private getDeviceConnectionPoint(device: Device, mousePoint: Point): Point {
        // Find closest edge point on device
        const deviceCenter = device.position;
        const halfWidth = device.size.width / 2;
        const halfHeight = device.size.height / 2;

        // Simple edge snapping - snap to closest edge
        const dx = mousePoint.x - deviceCenter.x;
        const dy = mousePoint.y - deviceCenter.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Snap to left or right edge
            return {
                x: deviceCenter.x + (dx > 0 ? halfWidth : -halfWidth),
                y: Math.max(deviceCenter.y - halfHeight, Math.min(deviceCenter.y + halfHeight, mousePoint.y))
            };
        } else {
            // Snap to top or bottom edge
            return {
                x: Math.max(deviceCenter.x - halfWidth, Math.min(deviceCenter.x + halfWidth, mousePoint.x)),
                y: deviceCenter.y + (dy > 0 ? halfHeight : -halfHeight)
            };
        }
    }

    private generateDeviceAnchors(device: Device): ConnectionAnchor[] {
        const anchors: ConnectionAnchor[] = [];
        const center = device.position;
        const halfWidth = device.size.width / 2;
        const halfHeight = device.size.height / 2;

        // Create anchors on each side
        const anchorPositions = [
            { position: { x: center.x, y: center.y - halfHeight }, direction: AnchorDirection.TOP },
            { position: { x: center.x + halfWidth, y: center.y }, direction: AnchorDirection.RIGHT },
            { position: { x: center.x, y: center.y + halfHeight }, direction: AnchorDirection.BOTTOM },
            { position: { x: center.x - halfWidth, y: center.y }, direction: AnchorDirection.LEFT }
        ];

        anchorPositions.forEach(({ position, direction }) => {
            anchors.push({
                deviceId: device.id,
                position,
                direction,
                isOccupied: false,
                maxConnections: 3,
                currentConnections: []
            });
        });

        return anchors;
    }

    private getDefaultStyleForType(type: ConnectionType): any {
        const config = this._connectionTypes$.value.find(t => t.type === type);
        return config?.defaultStyle || {
            stroke: '#666',
            strokeWidth: 2,
            style: ConnectionStyle.SOLID,
            opacity: 1,
            showArrows: false,
            showLabel: false
        };
    }

    private updateAnchorsAfterConnection(connection: Connection): void {
        // Mark anchors as occupied
        const anchors = this._availableAnchors$.value;
        const updatedAnchors = anchors.map(anchor => {
            if (anchor.deviceId === connection.sourceDeviceId ||
                anchor.deviceId === connection.targetDeviceId) {
                return {
                    ...anchor,
                    currentConnections: [...anchor.currentConnections, connection.id],
                    isOccupied: anchor.currentConnections.length >= anchor.maxConnections
                };
            }
            return anchor;
        });
        this._availableAnchors$.next(updatedAnchors);
    }

    private updateAnchorsAfterDisconnection(connection: Connection): void {
        // Free up anchors
        const anchors = this._availableAnchors$.value;
        const updatedAnchors = anchors.map(anchor => {
            if (anchor.currentConnections.includes(connection.id)) {
                const filteredConnections = anchor.currentConnections.filter(id => id !== connection.id);
                return {
                    ...anchor,
                    currentConnections: filteredConnections,
                    isOccupied: false
                };
            }
            return anchor;
        });
        this._availableAnchors$.next(updatedAnchors);
    }

    private getAnchorsForConnection(connection: Connection): ConnectionAnchor[] {
        const anchors = this._availableAnchors$.value;
        return anchors.filter(anchor =>
            anchor.deviceId === connection.sourceDeviceId ||
            anchor.deviceId === connection.targetDeviceId
        );
    }

    private calculateConnectionLength(points: Point[]): number {
        if (points.length < 2) return 0;

        let length = 0;
        for (let i = 1; i < points.length; i++) {
            length += MathUtils.distance(points[i - 1], points[i]);
        }
        return length;
    }

    private createSegmentsFromPoints(points: Point[]): ConnectionSegment[] {
        const segments: ConnectionSegment[] = [];

        for (let i = 1; i < points.length; i++) {
            const start = points[i - 1];
            const end = points[i];
            const length = MathUtils.distance(start, end);

            let direction: 'horizontal' | 'vertical' | 'diagonal' = 'diagonal';
            if (Math.abs(start.x - end.x) < 1) direction = 'vertical';
            else if (Math.abs(start.y - end.y) < 1) direction = 'horizontal';

            segments.push({
                start,
                end,
                length,
                direction
            });
        }

        return segments;
    }

    private detectLoops(connections: Connection[]): boolean {
        // Simplified loop detection
        return false;
    }

    private findIsolatedDevices(connections: Connection[], allDeviceIds: string[]): string[] {
        const connectedDevices = new Set<string>();
        connections.forEach(conn => {
            connectedDevices.add(conn.sourceDeviceId);
            connectedDevices.add(conn.targetDeviceId);
        });

        return allDeviceIds.filter(id => !connectedDevices.has(id));
    }

    private emitInteractionEvent(event: ConnectionInteractionEvent): void {
        this._interactionEvents$.next(event);
    }
}