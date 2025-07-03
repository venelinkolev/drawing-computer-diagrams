import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import {
    Project,
    Device,
    Connection,
    Annotation,
    ProjectMetadata,
    ProjectSettings
} from '@core/models';
import { APP_CONFIG, CANVAS_CONFIG } from '@core/constants';
import { IdUtils } from '@shared/utils';

export interface ProjectState {
    currentProject: Project | null;
    hasUnsavedChanges: boolean;
    isLoading: boolean;
    lastSavedAt: Date | null;
    autoSaveEnabled: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ProjectStateService {

    // Private state subjects
    private readonly _currentProject$ = new BehaviorSubject<Project | null>(null);
    private readonly _hasUnsavedChanges$ = new BehaviorSubject<boolean>(false);
    private readonly _isLoading$ = new BehaviorSubject<boolean>(false);
    private readonly _lastSavedAt$ = new BehaviorSubject<Date | null>(null);
    private readonly _autoSaveEnabled$ = new BehaviorSubject<boolean>(APP_CONFIG.AUTO_SAVE.ENABLED);

    // Public readonly observables
    readonly currentProject$ = this._currentProject$.asObservable();
    readonly hasUnsavedChanges$ = this._hasUnsavedChanges$.asObservable();
    readonly isLoading$ = this._isLoading$.asObservable();
    readonly lastSavedAt$ = this._lastSavedAt$.asObservable();
    readonly autoSaveEnabled$ = this._autoSaveEnabled$.asObservable();

    // Combined state observable
    readonly projectState$: Observable<ProjectState> = combineLatest([
        this.currentProject$,
        this.hasUnsavedChanges$,
        this.isLoading$,
        this.lastSavedAt$,
        this.autoSaveEnabled$
    ]).pipe(
        map(([currentProject, hasUnsavedChanges, isLoading, lastSavedAt, autoSaveEnabled]) => ({
            currentProject,
            hasUnsavedChanges,
            isLoading,
            lastSavedAt,
            autoSaveEnabled
        }))
    );

    // Computed observables
    readonly hasActiveProject$ = this.currentProject$.pipe(
        map(project => project !== null)
    );

    readonly projectTitle$ = this.currentProject$.pipe(
        map(project => project?.metadata.title || 'Untitled Project')
    );

    readonly deviceCount$ = this.currentProject$.pipe(
        map(project => project?.devices.length || 0)
    );

    readonly connectionCount$ = this.currentProject$.pipe(
        map(project => project?.connections.length || 0)
    );

    constructor() {
        this.initializeAutoSave();
    }

    // === PROJECT LIFECYCLE ===

    /**
     * Create a new empty project
     */
    createNewProject(metadata?: Partial<ProjectMetadata>): Project {
        const project: Project = {
            id: IdUtils.generateUUID(),
            metadata: {
                title: metadata?.title || 'Untitled Project',
                description: metadata?.description || '',
                author: metadata?.author || '',
                company: metadata?.company || '',
                version: '1.0.0',
                tags: metadata?.tags || [],
                category: metadata?.category || 'network-diagram',
            },
            settings: this.getDefaultProjectSettings(),
            devices: [],
            connections: [],
            annotations: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.setCurrentProject(project);
        this.markAsUnsaved();

        return project;
    }

    /**
     * Load an existing project
     */
    loadProject(project: Project): void {
        this._isLoading$.next(true);

        try {
            // Validate project structure
            this.validateProject(project);

            // Update timestamps
            project.updatedAt = new Date();

            this.setCurrentProject(project);
            this.markAsSaved();

        } catch (error) {
            console.error('Error loading project:', error);
            throw new Error('Invalid project format');
        } finally {
            this._isLoading$.next(false);
        }
    }

    /**
     * Close current project
     */
    closeProject(): void {
        this.setCurrentProject(null);
        this.markAsSaved();
    }

    /**
     * Get current project (synchronous)
     */
    getCurrentProject(): Project | null {
        return this._currentProject$.value;
    }

    // === PROJECT METADATA ===

    /**
     * Update project metadata
     */
    updateProjectMetadata(metadata: Partial<ProjectMetadata>): void {
        const project = this.getCurrentProject();
        if (!project) return;

        project.metadata = { ...project.metadata, ...metadata };
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    /**
     * Update project settings
     */
    updateProjectSettings(settings: Partial<ProjectSettings>): void {
        const project = this.getCurrentProject();
        if (!project) return;

        project.settings = { ...project.settings, ...settings };
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    // === DEVICE MANAGEMENT ===

    /**
     * Add device to current project
     */
    addDevice(device: Device): void {
        const project = this.getCurrentProject();
        if (!project) return;

        // Check limits
        if (project.devices.length >= APP_CONFIG.LIMITS.MAX_DEVICES) {
            throw new Error(`Maximum devices limit reached (${APP_CONFIG.LIMITS.MAX_DEVICES})`);
        }

        project.devices.push(device);
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    /**
     * Update device in current project
     */
    updateDevice(deviceId: string, updates: Partial<Device>): void {
        const project = this.getCurrentProject();
        if (!project) return;

        const deviceIndex = project.devices.findIndex(d => d.id === deviceId);
        if (deviceIndex === -1) return;

        project.devices[deviceIndex] = {
            ...project.devices[deviceIndex],
            ...updates,
            updatedAt: new Date()
        };
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    /**
     * Remove device from current project
     */
    removeDevice(deviceId: string): void {
        const project = this.getCurrentProject();
        if (!project) return;

        // Remove device
        project.devices = project.devices.filter(d => d.id !== deviceId);

        // Remove related connections
        project.connections = project.connections.filter(
            c => c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId
        );

        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    /**
     * Get device by ID
     */
    getDevice(deviceId: string): Device | null {
        const project = this.getCurrentProject();
        if (!project) return null;

        return project.devices.find(d => d.id === deviceId) || null;
    }

    // === CONNECTION MANAGEMENT ===

    /**
     * Add connection to current project
     */
    addConnection(connection: Connection): void {
        const project = this.getCurrentProject();
        if (!project) return;

        // Check limits
        if (project.connections.length >= APP_CONFIG.LIMITS.MAX_CONNECTIONS) {
            throw new Error(`Maximum connections limit reached (${APP_CONFIG.LIMITS.MAX_CONNECTIONS})`);
        }

        // Validate that source and target devices exist
        const sourceExists = project.devices.some(d => d.id === connection.sourceDeviceId);
        const targetExists = project.devices.some(d => d.id === connection.targetDeviceId);

        if (!sourceExists || !targetExists) {
            throw new Error('Connection references non-existent devices');
        }

        project.connections.push(connection);
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    /**
     * Update connection in current project
     */
    updateConnection(connectionId: string, updates: Partial<Connection>): void {
        const project = this.getCurrentProject();
        if (!project) return;

        const connectionIndex = project.connections.findIndex(c => c.id === connectionId);
        if (connectionIndex === -1) return;

        project.connections[connectionIndex] = {
            ...project.connections[connectionIndex],
            ...updates,
            updatedAt: new Date()
        };
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    /**
     * Remove connection from current project
     */
    removeConnection(connectionId: string): void {
        const project = this.getCurrentProject();
        if (!project) return;

        project.connections = project.connections.filter(c => c.id !== connectionId);
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    // === ANNOTATION MANAGEMENT ===

    /**
     * Add annotation to current project
     */
    addAnnotation(annotation: Annotation): void {
        const project = this.getCurrentProject();
        if (!project) return;

        project.annotations.push(annotation);
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    /**
     * Remove annotation from current project
     */
    removeAnnotation(annotationId: string): void {
        const project = this.getCurrentProject();
        if (!project) return;

        project.annotations = project.annotations.filter(a => a.id !== annotationId);
        project.updatedAt = new Date();

        this._currentProject$.next(project);
        this.markAsUnsaved();
    }

    // === SAVE STATE MANAGEMENT ===

    /**
     * Mark project as saved
     */
    markAsSaved(): void {
        this._hasUnsavedChanges$.next(false);
        this._lastSavedAt$.next(new Date());
    }

    /**
     * Mark project as having unsaved changes
     */
    markAsUnsaved(): void {
        this._hasUnsavedChanges$.next(true);
    }

    /**
     * Toggle auto-save
     */
    setAutoSave(enabled: boolean): void {
        this._autoSaveEnabled$.next(enabled);
    }

    // === PRIVATE HELPERS ===

    private setCurrentProject(project: Project | null): void {
        this._currentProject$.next(project);
    }

    private getDefaultProjectSettings(): ProjectSettings {
        return {
            canvasSize: { width: 1200, height: 800 },
            gridSize: CANVAS_CONFIG.GRID.SIZE,
            showGrid: true,
            snapToGrid: CANVAS_CONFIG.SNAP.ENABLED,
            theme: 'light',
            autoSave: APP_CONFIG.AUTO_SAVE.ENABLED,
            autoSaveInterval: APP_CONFIG.AUTO_SAVE.INTERVAL / 1000, // convert to seconds
        };
    }

    private validateProject(project: Project): void {
        if (!project.id || !project.metadata || !project.settings) {
            throw new Error('Invalid project structure');
        }

        if (!Array.isArray(project.devices)) {
            throw new Error('Project devices must be an array');
        }

        if (!Array.isArray(project.connections)) {
            throw new Error('Project connections must be an array');
        }

        if (!Array.isArray(project.annotations)) {
            throw new Error('Project annotations must be an array');
        }
    }

    private initializeAutoSave(): void {
        // Auto-save implementation will be added in StorageService integration
        // For now, just log when auto-save should trigger
        this.hasUnsavedChanges$.subscribe(hasChanges => {
            if (hasChanges && this._autoSaveEnabled$.value) {
                console.log('📝 Auto-save trigger: Project has unsaved changes');
            }
        });
    }
}