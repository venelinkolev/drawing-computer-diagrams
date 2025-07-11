import { Device, DeviceType, DeviceStyle, Size, Point } from './device.model';

/**
 * Device library categories for organization
 */
export enum DeviceCategory {
    NETWORK = 'network',
    SERVERS = 'servers',
    COMPUTERS = 'computers',
    PERIPHERALS = 'peripherals',
    STORAGE = 'storage',
    SECURITY = 'security',
    MOBILE = 'mobile',
    CUSTOM = 'custom',
    FAVORITES = 'favorites',
    RECENT = 'recent'
}

/**
 * Device subcategories for more granular organization
 */
export interface DeviceSubcategory {
    id: string;
    name: string;
    category: DeviceCategory;
    description?: string;
    icon?: string;
    color?: string;
}

/**
 * Device template for creating new devices
 */
export interface DeviceTemplate {
    id: string;
    name: string;
    description: string;
    category: DeviceCategory;
    subcategory?: string;
    deviceType: DeviceType;
    icon: string;
    defaultSize: Size;
    defaultStyle: DeviceStyle;
    metadata: {
        manufacturer?: string;
        model?: string;
        specifications?: Record<string, any>;
        ports?: DevicePortTemplate[];
        tags: string[];
        keywords: string[];
    };
    assets: {
        iconUrl?: string;
        imageUrl?: string;
        svgContent?: string;
        thumbnailUrl?: string;
    };
    configuration: {
        isCustomizable: boolean;
        allowStyleOverride: boolean;
        allowSizeOverride: boolean;
        requiredFields?: string[];
        defaultValues?: Record<string, any>;
    };
    usage: {
        popularity: number;
        lastUsed?: Date;
        useCount: number;
        isFavorite: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    version: string;
}

/**
 * Device port template for connection points
 */
export interface DevicePortTemplate {
    name: string;
    type: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    offset: Point;
    isRequired: boolean;
    maxConnections: number;
    allowedConnectionTypes: string[];
}

/**
 * Device library search criteria
 */
export interface DeviceSearchCriteria {
    query?: string;
    category?: DeviceCategory;
    subcategory?: string;
    deviceType?: DeviceType;
    tags?: string[];
    manufacturer?: string;
    minPopularity?: number;
    onlyFavorites?: boolean;
    onlyRecent?: boolean;
    sortBy: DeviceSortBy;
    sortOrder: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

/**
 * Device sorting options
 */
export enum DeviceSortBy {
    NAME = 'name',
    CATEGORY = 'category',
    POPULARITY = 'popularity',
    LAST_USED = 'lastUsed',
    CREATED_AT = 'createdAt',
    USE_COUNT = 'useCount'
}

/**
 * Device library filter state
 */
export interface DeviceFilter {
    categories: DeviceCategory[];
    subcategories: string[];
    deviceTypes: DeviceType[];
    tags: string[];
    manufacturers: string[];
    showFavoritesOnly: boolean;
    showRecentOnly: boolean;
    searchQuery: string;
}

/**
 * Device library state
 */
export interface DeviceLibraryState {
    templates: DeviceTemplate[];
    categories: DeviceSubcategory[];
    searchCriteria: DeviceSearchCriteria;
    activeFilter: DeviceFilter;
    searchResults: DeviceTemplate[];
    selectedTemplate: DeviceTemplate | null;
    recentTemplates: DeviceTemplate[];
    favoriteTemplates: DeviceTemplate[];
    isLoading: boolean;
    lastUpdate: Date;
}

/**
 * Device creation result
 */
export interface DeviceCreationResult {
    success: boolean;
    device?: Device;
    template?: DeviceTemplate;
    error?: string;
    message?: string;
    warnings?: string[];
}

/**
 * Device library configuration
 */
export interface DeviceLibraryConfig {
    maxRecentItems: number;
    maxFavorites: number;
    enableCustomDevices: boolean;
    enableAssetUpload: boolean;
    defaultCategory: DeviceCategory;
    searchDebounceMs: number;
    cacheExpiryMinutes: number;
    autoSaveChanges: boolean;
}

/**
 * Device asset information
 */
export interface DeviceAsset {
    id: string;
    name: string;
    type: 'icon' | 'image' | 'svg' | 'thumbnail';
    url: string;
    localPath?: string;
    size: number;
    dimensions?: Size;
    format: string;
    checksum?: string;
    uploadedAt: Date;
    isDefault: boolean;
}

/**
 * Custom device creation data
 */
export interface CustomDeviceData {
    name: string;
    description: string;
    category: DeviceCategory;
    subcategory?: string;
    size: Size;
    style: Partial<DeviceStyle>;
    icon: string;
    assets?: {
        iconFile?: File;
        imageFile?: File;
        svgContent?: string;
    };
    metadata: {
        manufacturer?: string;
        model?: string;
        specifications?: Record<string, any>;
        tags: string[];
    };
    ports?: DevicePortTemplate[];
}

/**
 * Device library analytics
 */
export interface DeviceLibraryAnalytics {
    totalTemplates: number;
    templatesByCategory: Record<DeviceCategory, number>;
    mostPopularTemplates: DeviceTemplate[];
    recentlyAddedTemplates: DeviceTemplate[];
    searchQueries: {
        query: string;
        count: number;
        lastSearched: Date;
    }[];
    categoryUsage: {
        category: DeviceCategory;
        useCount: number;
        percentage: number;
    }[];
}

/**
 * Device import/export data
 */
export interface DeviceLibraryExport {
    version: string;
    exportDate: Date;
    templates: DeviceTemplate[];
    categories: DeviceSubcategory[];
    assets: DeviceAsset[];
    metadata: {
        exportedBy?: string;
        description?: string;
        tags?: string[];
    };
}

/**
 * Device validation result
 */
export interface DeviceValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions?: string[];
}

/**
 * Device library events
 */
export interface DeviceLibraryEvent {
    type: DeviceLibraryEventType;
    templateId?: string;
    template?: DeviceTemplate;
    searchCriteria?: DeviceSearchCriteria;
    timestamp: Date;
    userId?: string;
    metadata?: Record<string, any>;
}

/**
 * Device library event types
 */
export enum DeviceLibraryEventType {
    TEMPLATE_CREATED = 'template_created',
    TEMPLATE_UPDATED = 'template_updated',
    TEMPLATE_DELETED = 'template_deleted',
    TEMPLATE_USED = 'template_used',
    TEMPLATE_FAVORITED = 'template_favorited',
    TEMPLATE_UNFAVORITED = 'template_unfavorited',
    SEARCH_PERFORMED = 'search_performed',
    FILTER_APPLIED = 'filter_applied',
    CATEGORY_CREATED = 'category_created',
    LIBRARY_IMPORTED = 'library_imported',
    LIBRARY_EXPORTED = 'library_exported'
}

// === PREDEFINED CATEGORIES ===

/**
 * Default device subcategories
 */
export const DEFAULT_SUBCATEGORIES: DeviceSubcategory[] = [
    // Network category
    {
        id: 'routers',
        name: 'Routers',
        category: DeviceCategory.NETWORK,
        description: 'Network routing devices',
        icon: 'router',
        color: '#2196F3'
    },
    {
        id: 'switches',
        name: 'Switches',
        category: DeviceCategory.NETWORK,
        description: 'Network switching devices',
        icon: 'hub',
        color: '#2196F3'
    },
    {
        id: 'access_points',
        name: 'Access Points',
        category: DeviceCategory.NETWORK,
        description: 'Wireless access points',
        icon: 'wifi',
        color: '#2196F3'
    },
    {
        id: 'firewalls',
        name: 'Firewalls',
        category: DeviceCategory.SECURITY,
        description: 'Network security devices',
        icon: 'security',
        color: '#F44336'
    },

    // Servers category
    {
        id: 'web_servers',
        name: 'Web Servers',
        category: DeviceCategory.SERVERS,
        description: 'Web and application servers',
        icon: 'dns',
        color: '#4CAF50'
    },
    {
        id: 'database_servers',
        name: 'Database Servers',
        category: DeviceCategory.SERVERS,
        description: 'Database management servers',
        icon: 'storage',
        color: '#4CAF50'
    },
    {
        id: 'file_servers',
        name: 'File Servers',
        category: DeviceCategory.SERVERS,
        description: 'File storage and sharing servers',
        icon: 'folder',
        color: '#4CAF50'
    },

    // Computers category
    {
        id: 'desktops',
        name: 'Desktop Computers',
        category: DeviceCategory.COMPUTERS,
        description: 'Desktop workstations',
        icon: 'computer',
        color: '#9C27B0'
    },
    {
        id: 'laptops',
        name: 'Laptops',
        category: DeviceCategory.COMPUTERS,
        description: 'Portable computers',
        icon: 'laptop',
        color: '#9C27B0'
    },
    {
        id: 'workstations',
        name: 'Workstations',
        category: DeviceCategory.COMPUTERS,
        description: 'High-performance workstations',
        icon: 'workstation',
        color: '#9C27B0'
    },

    // Peripherals category
    {
        id: 'printers',
        name: 'Printers',
        category: DeviceCategory.PERIPHERALS,
        description: 'Printing devices',
        icon: 'print',
        color: '#FF9800'
    },
    {
        id: 'scanners',
        name: 'Scanners',
        category: DeviceCategory.PERIPHERALS,
        description: 'Document scanning devices',
        icon: 'scanner',
        color: '#FF9800'
    },
    {
        id: 'monitors',
        name: 'Monitors',
        category: DeviceCategory.PERIPHERALS,
        description: 'Display monitors',
        icon: 'monitor',
        color: '#FF9800'
    },

    // Storage category
    {
        id: 'nas',
        name: 'NAS Devices',
        category: DeviceCategory.STORAGE,
        description: 'Network Attached Storage',
        icon: 'nas',
        color: '#607D8B'
    },
    {
        id: 'san',
        name: 'SAN Devices',
        category: DeviceCategory.STORAGE,
        description: 'Storage Area Network',
        icon: 'san',
        color: '#607D8B'
    },

    // Mobile category
    {
        id: 'smartphones',
        name: 'Smartphones',
        category: DeviceCategory.MOBILE,
        description: 'Mobile phones',
        icon: 'smartphone',
        color: '#795548'
    },
    {
        id: 'tablets',
        name: 'Tablets',
        category: DeviceCategory.MOBILE,
        description: 'Tablet devices',
        icon: 'tablet',
        color: '#795548'
    }
];

/**
 * Default device library configuration
 */
export const DEFAULT_DEVICE_LIBRARY_CONFIG: DeviceLibraryConfig = {
    maxRecentItems: 10,
    maxFavorites: 20,
    enableCustomDevices: true,
    enableAssetUpload: true,
    defaultCategory: DeviceCategory.NETWORK,
    searchDebounceMs: 300,
    cacheExpiryMinutes: 60,
    autoSaveChanges: true
};