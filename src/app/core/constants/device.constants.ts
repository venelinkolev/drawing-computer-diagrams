import { DeviceType } from '@core/models';

export const DEVICE_CATEGORIES = {
    NETWORK: 'Network Equipment',
    COMPUTERS: 'Computers & Laptops',
    STORAGE: 'Storage Devices',
    PERIPHERALS: 'Peripherals',
    SECURITY: 'Security Equipment',
    MOBILE: 'Mobile Devices',
} as const;

export const DEVICE_CONFIG = {
    [DeviceType.ROUTER]: {
        category: DEVICE_CATEGORIES.NETWORK,
        defaultSize: { width: 80, height: 60 },
        icon: '🔀',
        color: '#FF6B6B',
    },
    [DeviceType.SWITCH]: {
        category: DEVICE_CATEGORIES.NETWORK,
        defaultSize: { width: 120, height: 40 },
        icon: '🔗',
        color: '#4ECDC4',
    },
    [DeviceType.SERVER]: {
        category: DEVICE_CATEGORIES.COMPUTERS,
        defaultSize: { width: 100, height: 80 },
        icon: '🖥️',
        color: '#45B7D1',
    },
    [DeviceType.DESKTOP]: {
        category: DEVICE_CATEGORIES.COMPUTERS,
        defaultSize: { width: 70, height: 70 },
        icon: '🖱️',
        color: '#96CEB4',
    },
    [DeviceType.LAPTOP]: {
        category: DEVICE_CATEGORIES.COMPUTERS,
        defaultSize: { width: 90, height: 60 },
        icon: '💻',
        color: '#FFEAA7',
    },
    [DeviceType.PRINTER]: {
        category: DEVICE_CATEGORIES.PERIPHERALS,
        defaultSize: { width: 80, height: 50 },
        icon: '🖨️',
        color: '#DDA0DD',
    },
    [DeviceType.FIREWALL]: {
        category: DEVICE_CATEGORIES.SECURITY,
        defaultSize: { width: 100, height: 60 },
        icon: '🛡️',
        color: '#FF7675',
    },
    [DeviceType.ACCESS_POINT]: {
        category: DEVICE_CATEGORIES.NETWORK,
        defaultSize: { width: 60, height: 60 },
        icon: '📡',
        color: '#74B9FF',
    },
    [DeviceType.STORAGE]: {
        category: DEVICE_CATEGORIES.STORAGE,
        defaultSize: { width: 90, height: 70 },
        icon: '💾',
        color: '#6C5CE7',
    },
    [DeviceType.PHONE]: {
        category: DEVICE_CATEGORIES.MOBILE,
        defaultSize: { width: 40, height: 80 },
        icon: '📱',
        color: '#00B894',
    },
    [DeviceType.TABLET]: {
        category: DEVICE_CATEGORIES.MOBILE,
        defaultSize: { width: 60, height: 80 },
        icon: '📱',
        color: '#00CEC9',
    },
    [DeviceType.CUSTOM]: {
        category: DEVICE_CATEGORIES.NETWORK,
        defaultSize: { width: 80, height: 60 },
        icon: '⚙️',
        color: '#636E72',
    },
} as const;

export const DEFAULT_DEVICE_STYLE = {
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 2,
    opacity: 1,
    cornerRadius: 4,
} as const;