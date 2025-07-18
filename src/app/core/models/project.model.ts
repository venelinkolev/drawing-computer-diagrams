import { Device } from './device.model';
import { Connection } from './connection.model';
import { Size, Point } from './device.model';

export interface ProjectMetadata {
    title: string;
    description?: string;
    author?: string;
    company?: string;
    version: string;
    tags?: string[];
    category?: string;
}

export interface ProjectSettings {
    canvasSize: Size;
    gridSize: number;
    showGrid: boolean;
    snapToGrid: boolean;
    theme: 'light' | 'dark';
    autoSave: boolean;
    autoSaveInterval: number;
}

export interface Annotation {
    id: string;
    type: 'text' | 'callout' | 'note';
    position: Point;
    content: string;
    style: {
        fontSize: number;
        fontFamily: string;
        color: string;
        backgroundColor?: string;
        padding: number;
    };
    createdAt: Date;
}

export interface Project {
    id: string;
    metadata: ProjectMetadata;
    settings: ProjectSettings;
    devices: Device[];
    connections: Connection[];
    annotations: Annotation[];
    createdAt: Date;
    updatedAt: Date;
    lastSavedAt?: Date;
}