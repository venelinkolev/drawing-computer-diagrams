import { Device } from './device.model';
import { Connection } from './connection.model';
import { Annotation, ProjectSettings } from './project.model';

export interface TemplateMetadata {
    name: string;
    description: string;
    category: string;
    tags: string[];
    thumbnail?: string;
    author?: string;
    version: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Template {
    id: string;
    metadata: TemplateMetadata;
    devices: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>[];
    connections: Omit<Connection, 'id' | 'createdAt' | 'updatedAt' | 'sourceDeviceId' | 'targetDeviceId'>[];
    annotations: Omit<Annotation, 'id' | 'createdAt'>[];
    settings: Partial<ProjectSettings>;
    createdAt: Date;
}