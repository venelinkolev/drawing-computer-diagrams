export const CANVAS_CONFIG = {
    // Grid settings
    GRID: {
        SIZE: 20,
        COLOR: '#e8e8e8',
        OPACITY: 0.5,
    },

    // Zoom settings
    ZOOM: {
        MIN: 0.1,
        MAX: 5.0,
        STEP: 0.1,
        DEFAULT: 1.0,
        WHEEL_SENSITIVITY: 1.1,
    },

    // Selection
    SELECTION: {
        COLOR: '#2196f3',
        STROKE_WIDTH: 3,
        OPACITY: 0.3,
    },

    // Snap settings
    SNAP: {
        DISTANCE: 10,
        ENABLED: true,
    },

    // Layer indices
    LAYERS: {
        BACKGROUND: 0,
        GRID: 1,
        CONNECTIONS: 2,
        DEVICES: 3,
        ANNOTATIONS: 4,
        SELECTION: 5,
        UI: 6,
    },

    // Performance
    PERFORMANCE: {
        MAX_VISIBLE_OBJECTS: 500,
        RENDER_BATCH_SIZE: 50,
        THROTTLE_MS: 16, // ~60fps
    },
} as const;

export const CONNECTION_CONFIG = {
    DEFAULT_STYLE: {
        stroke: '#757575',
        strokeWidth: 2,
        opacity: 1,
        showArrows: true,
        showLabel: false,
    },

    STYLES_BY_TYPE: {
        ethernet: { stroke: '#4CAF50', strokeWidth: 3 },
        wifi: { stroke: '#FF9800', strokeWidth: 2, style: 'dashed' },
        usb: { stroke: '#9C27B0', strokeWidth: 2 },
        hdmi: { stroke: '#F44336', strokeWidth: 3 },
        power: { stroke: '#795548', strokeWidth: 4 },
    },

    ROUTING: {
        CORNER_RADIUS: 10,
        AVOID_DEVICES: true,
        MIN_SEGMENT_LENGTH: 20,
    },
} as const;