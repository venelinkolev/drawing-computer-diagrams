import { Point } from './device.model';

export enum ConnectionType {
    ETHERNET = 'ethernet',
    WIFI = 'wifi',
    USB = 'usb',
    HDMI = 'hdmi',
    VGA = 'vga',
    SERIAL = 'serial',
    POWER = 'power',
    CUSTOM = 'custom'
}

export enum ConnectionStyle {
    SOLID = 'solid',
    DASHED = 'dashed',
    DOTTED = 'dotted'
}

export interface ConnectionMetadata {
    name?: string;
    description?: string;
    bandwidth?: string;
    protocol?: string;
    vlanId?: number;
    ipRange?: string;
    tags?: string[];
}

export interface ConnectionVisualStyle {
    stroke: string;
    strokeWidth: number;
    style: ConnectionStyle;
    opacity: number;
    showArrows: boolean;
    showLabel: boolean;
}

export interface Connection {
    id: string;
    type: ConnectionType;
    sourceDeviceId: string;
    targetDeviceId: string;
    sourcePortId?: string;
    targetPortId?: string;
    points: Point[];
    metadata: ConnectionMetadata;
    visualStyle: ConnectionVisualStyle;
    isSelected: boolean;
    layerIndex: number;
    createdAt: Date;
    updatedAt: Date;
}