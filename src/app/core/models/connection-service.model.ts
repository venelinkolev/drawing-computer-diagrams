import { Connection, ConnectionType, ConnectionStyle } from './connection.model';
import { Point, Device } from './device.model';

/**
 * Connection drawing state
 */
export interface ConnectionDrawingState {
    isDrawing: boolean;
    startDevice?: Device;
    startPoint?: Point;
    currentPoint?: Point;
    endDevice?: Device;
    endPoint?: Point;
    previewPoints: Point[];
    drawingMode: ConnectionDrawingMode;
    snapDistance: number;
    showSnapIndicators: boolean;
}

/**
 * Connection drawing modes
 */
export enum ConnectionDrawingMode {
    STRAIGHT = 'straight',
    ORTHOGONAL = 'orthogonal',
    BEZIER = 'bezier',
    SMART_ROUTING = 'smart_routing'
}

/**
 * Connection anchor point (for device connections)
 */
export interface ConnectionAnchor {
    deviceId: string;
    portId?: string;
    position: Point;
    direction: AnchorDirection;
    isOccupied: boolean;
    maxConnections: number;
    currentConnections: string[];
}

/**
 * Anchor directions for smart connection routing
 */
export enum AnchorDirection {
    TOP = 'top',
    RIGHT = 'right',
    BOTTOM = 'bottom',
    LEFT = 'left',
    CENTER = 'center'
}

/**
 * Connection routing algorithm result
 */
export interface ConnectionRoute {
    points: Point[];
    totalLength: number;
    segments: ConnectionSegment[];
    intersections: Point[];
    isOptimal: boolean;
}

/**
 * Connection segment for advanced routing
 */
export interface ConnectionSegment {
    start: Point;
    end: Point;
    length: number;
    direction: 'horizontal' | 'vertical' | 'diagonal';
    style?: ConnectionStyle;
}

/**
 * Connection validation result
 */
export interface ConnectionValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
    autoFixAvailable: boolean;
}

/**
 * Connection service state
 */
export interface ConnectionServiceState {
    connections: Connection[];
    selectedConnections: Connection[];
    drawingState: ConnectionDrawingState;
    availableAnchors: ConnectionAnchor[];
    connectionTypes: ConnectionTypeConfig[];
    drawingMode: ConnectionDrawingMode;
    snapSettings: ConnectionSnapSettings;
    renderSettings: ConnectionRenderSettings;
    isEnabled: boolean;
    lastUpdate: Date;
}

/**
 * Connection type configuration
 */
export interface ConnectionTypeConfig {
    type: ConnectionType;
    name: string;
    description: string;
    icon: string;
    defaultStyle: {
        stroke: string;
        strokeWidth: number;
        style: ConnectionStyle;
        opacity: number;
        showArrows: boolean;
        showLabel: boolean;
    };
    constraints: {
        maxLength?: number;
        allowedDeviceTypes: string[];
        requiresPorts: boolean;
        bidirectional: boolean;
    };
    metadata: {
        bandwidth?: string;
        protocol?: string;
        category: string;
        tags: string[];
    };
}

/**
 * Connection snap settings
 */
export interface ConnectionSnapSettings {
    enabled: boolean;
    snapToDevices: boolean;
    snapToPorts: boolean;
    snapToGrid: boolean;
    snapToConnections: boolean;
    snapDistance: number;
    showSnapIndicators: boolean;
    highlightSnapTargets: boolean;
}

/**
 * Connection rendering settings
 */
export interface ConnectionRenderSettings {
    showArrows: boolean;
    showLabels: boolean;
    showBandwidth: boolean;
    animateConnections: boolean;
    highlightOnHover: boolean;
    selectionColor: string;
    hoverColor: string;
    temporaryConnectionColor: string;
    layerIndex: number;
}

/**
 * Connection creation request
 */
export interface ConnectionCreationRequest {
    sourceDeviceId: string;
    targetDeviceId: string;
    sourcePortId?: string;
    targetPortId?: string;
    connectionType: ConnectionType;
    customPoints?: Point[];
    metadata?: {
        name?: string;
        description?: string;
        bandwidth?: string;
        protocol?: string;
    };
    style?: Partial<ConnectionStyle>;
    autoRoute?: boolean;
}

/**
 * Connection creation result
 */
export interface ConnectionCreationResult {
    success: boolean;
    connection?: Connection;
    error?: string;
    warnings?: string[];
    route?: ConnectionRoute;
    anchorsUsed?: ConnectionAnchor[];
}

/**
 * Connection interaction event
 */
export interface ConnectionInteractionEvent {
    type: ConnectionEventType;
    connection?: Connection;
    position?: Point;
    device?: Device;
    anchor?: ConnectionAnchor;
    timestamp: Date;
    modifiers?: {
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
    };
}

/**
 * Connection event types
 */
export enum ConnectionEventType {
    DRAWING_START = 'drawing_start',
    DRAWING_UPDATE = 'drawing_update',
    DRAWING_END = 'drawing_end',
    DRAWING_CANCEL = 'drawing_cancel',
    CONNECTION_HOVER = 'connection_hover',
    CONNECTION_SELECT = 'connection_select',
    CONNECTION_DESELECT = 'connection_deselect',
    ANCHOR_HOVER = 'anchor_hover',
    ANCHOR_SNAP = 'anchor_snap'
}

/**
 * Connection template for common connection patterns
 */
export interface ConnectionTemplate {
    id: string;
    name: string;
    description: string;
    type: ConnectionType;
    pattern: ConnectionPattern;
    defaultStyle: ConnectionStyle;
    useCase: string;
    category: string;
    isBuiltIn: boolean;
}

/**
 * Connection patterns for common scenarios
 */
export enum ConnectionPattern {
    POINT_TO_POINT = 'point_to_point',
    STAR_TOPOLOGY = 'star_topology',
    BUS_TOPOLOGY = 'bus_topology',
    RING_TOPOLOGY = 'ring_topology',
    MESH_TOPOLOGY = 'mesh_topology',
    TREE_TOPOLOGY = 'tree_topology'
}

/**
 * Bulk connection operation
 */
export interface BulkConnectionOperation {
    type: 'create' | 'delete' | 'update' | 'reroute';
    connections: Connection[];
    options?: {
        autoRoute?: boolean;
        preserveStyle?: boolean;
        validateBeforeApply?: boolean;
    };
}

/**
 * Connection analytics data
 */
export interface ConnectionAnalytics {
    totalConnections: number;
    connectionsByType: Record<ConnectionType, number>;
    averageConnectionLength: number;
    mostConnectedDevice: {
        deviceId: string;
        connectionCount: number;
    };
    connectionDensity: number;
    topologyAnalysis: {
        hasLoops: boolean;
        isolatedDevices: string[];
        redundantPaths: ConnectionRoute[];
    };
}

/**
 * Connection export data
 */
export interface ConnectionExportData {
    connections: Connection[];
    metadata: {
        exportDate: Date;
        totalConnections: number;
        includedTypes: ConnectionType[];
    };
    settings: {
        drawingMode: ConnectionDrawingMode;
        snapSettings: ConnectionSnapSettings;
        renderSettings: ConnectionRenderSettings;
    };
}

// === PREDEFINED CONNECTION CONFIGURATIONS ===

/**
 * Default connection type configurations
 */
export const DEFAULT_CONNECTION_TYPES: ConnectionTypeConfig[] = [
    {
        type: ConnectionType.ETHERNET,
        name: 'Ethernet Cable',
        description: 'Standard network cable connection',
        icon: '🔗',
        defaultStyle: {
            stroke: '#4CAF50',
            strokeWidth: 3,
            style: ConnectionStyle.SOLID,
            opacity: 1,
            showArrows: false,
            showLabel: true
        },
        constraints: {
            maxLength: 100, // meters
            allowedDeviceTypes: ['router', 'switch', 'server', 'desktop', 'laptop'],
            requiresPorts: true,
            bidirectional: true
        },
        metadata: {
            bandwidth: '1Gbps',
            protocol: 'TCP/IP',
            category: 'network',
            tags: ['wired', 'ethernet', 'rj45']
        }
    },
    {
        type: ConnectionType.WIFI,
        name: 'WiFi Connection',
        description: 'Wireless network connection',
        icon: '📶',
        defaultStyle: {
            stroke: '#FF9800',
            strokeWidth: 2,
            style: ConnectionStyle.DASHED,
            opacity: 0.8,
            showArrows: true,
            showLabel: false
        },
        constraints: {
            maxLength: 50, // meters
            allowedDeviceTypes: ['access_point', 'router', 'laptop', 'phone', 'tablet'],
            requiresPorts: false,
            bidirectional: true
        },
        metadata: {
            bandwidth: '300Mbps',
            protocol: '802.11n',
            category: 'wireless',
            tags: ['wireless', 'wifi', 'radio']
        }
    },
    {
        type: ConnectionType.USB,
        name: 'USB Cable',
        description: 'Universal Serial Bus connection',
        icon: '🔌',
        defaultStyle: {
            stroke: '#9C27B0',
            strokeWidth: 2,
            style: ConnectionStyle.SOLID,
            opacity: 1,
            showArrows: true,
            showLabel: false
        },
        constraints: {
            maxLength: 5, // meters
            allowedDeviceTypes: ['desktop', 'laptop', 'printer', 'storage'],
            requiresPorts: true,
            bidirectional: false
        },
        metadata: {
            bandwidth: '480Mbps',
            protocol: 'USB 2.0',
            category: 'peripheral',
            tags: ['usb', 'peripheral', 'data']
        }
    },
    {
        type: ConnectionType.HDMI,
        name: 'HDMI Cable',
        description: 'High-Definition Multimedia Interface',
        icon: '📺',
        defaultStyle: {
            stroke: '#F44336',
            strokeWidth: 3,
            style: ConnectionStyle.SOLID,
            opacity: 1,
            showArrows: true,
            showLabel: false
        },
        constraints: {
            maxLength: 15, // meters
            allowedDeviceTypes: ['desktop', 'laptop', 'server'],
            requiresPorts: true,
            bidirectional: false
        },
        metadata: {
            bandwidth: '18Gbps',
            protocol: 'HDMI 2.0',
            category: 'video',
            tags: ['hdmi', 'video', 'audio']
        }
    },
    {
        type: ConnectionType.POWER,
        name: 'Power Cable',
        description: 'Electrical power connection',
        icon: '⚡',
        defaultStyle: {
            stroke: '#795548',
            strokeWidth: 4,
            style: ConnectionStyle.SOLID,
            opacity: 1,
            showArrows: false,
            showLabel: false
        },
        constraints: {
            allowedDeviceTypes: ['router', 'switch', 'server', 'desktop', 'printer'],
            requiresPorts: false,
            bidirectional: false
        },
        metadata: {
            category: 'power',
            tags: ['power', 'electrical', 'supply']
        }
    }
];

/**
 * Default connection snap settings
 */
export const DEFAULT_SNAP_SETTINGS: ConnectionSnapSettings = {
    enabled: true,
    snapToDevices: true,
    snapToPorts: true,
    snapToGrid: false,
    snapToConnections: false,
    snapDistance: 20,
    showSnapIndicators: true,
    highlightSnapTargets: true
};

/**
 * Default connection render settings
 */
export const DEFAULT_RENDER_SETTINGS: ConnectionRenderSettings = {
    showArrows: true,
    showLabels: false,
    showBandwidth: false,
    animateConnections: false,
    highlightOnHover: true,
    selectionColor: '#2196F3',
    hoverColor: '#FFC107',
    temporaryConnectionColor: '#9E9E9E',
    layerIndex: 2
};

/**
 * Default drawing state
 */
export const DEFAULT_DRAWING_STATE: ConnectionDrawingState = {
    isDrawing: false,
    previewPoints: [],
    drawingMode: ConnectionDrawingMode.STRAIGHT,
    snapDistance: 20,
    showSnapIndicators: true
};