export const APP_CONFIG = {
    APP_NAME: 'Drawing Computer Diagrams',
    VERSION: '1.0.0',
    AUTHOR: 'Venelin Kolev',

    // Local Storage Keys
    STORAGE_KEYS: {
        PROJECTS: 'network_editor_projects',
        SETTINGS: 'network_editor_settings',
        RECENT_PROJECTS: 'network_editor_recent',
        AUTO_SAVE: 'network_editor_autosave',
    },

    // File Extensions
    FILE_EXTENSIONS: {
        PROJECT: '.ned',
        EXPORT_PNG: '.png',
        EXPORT_SVG: '.svg',
        EXPORT_PDF: '.pdf',
    },

    // Limits
    LIMITS: {
        MAX_DEVICES: 1000,
        MAX_CONNECTIONS: 2000,
        MAX_PROJECTS: 100,
        MAX_UNDO_STEPS: 50,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    },

    // Auto Save
    AUTO_SAVE: {
        INTERVAL: 30000, // 30 seconds
        ENABLED: true,
    },
} as const;