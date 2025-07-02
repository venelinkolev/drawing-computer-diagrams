export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export enum DeviceType {
    ROUTER = 'router',
    SWITCH = 'switch',
    SERVER = 'server',
    DESKTOP = 'desktop',
    LAPTOP = 'laptop',
    PRINTER = 'printer',
    FIREWALL = 'firewall',
    ACCESS_POINT = 'access_point',
    STORAGE = 'storage',
    PHONE = 'phone',
    TABLET = 'tablet',
    CUSTOM = 'custom'
}

export interface DeviceMetadata {
    name: string;
    description?: string;
    ipAddress?: string;
    macAddress?: string;
    model?: string;
    manufacturer?: string;
    operatingSystem?: string;
    specifications?: Record<string, any>;
    tags?: string[];
}

export interface DeviceStyle {
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    cornerRadius?: number;
}

export interface Device {
    id: string;
    type: DeviceType;
    position: Point;
    size: Size;
    rotation: number;
    metadata: DeviceMetadata;
    style: DeviceStyle;
    ports?: DevicePort[];
    isSelected: boolean;
    isLocked: boolean;
    layerIndex: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface DevicePort {
    id: string;
    name: string;
    type: PortType;
    position: Point;
    isConnected: boolean;
    connectionId?: string;
}

export enum PortType {
    ETHERNET = 'ethernet',
    USB = 'usb',
    HDMI = 'hdmi',
    VGA = 'vga',
    POWER = 'power',
    SERIAL = 'serial',
    CUSTOM = 'custom'
}