import { DeviceType } from '@core/models';

export const DEVICE_CATEGORIES = {
    NETWORK: 'Network Equipment',
    COMPUTERS: 'Computers & Laptops',
    STORAGE: 'Storage Devices',
    PERIPHERALS: 'Peripherals',
    SECURITY: 'Security Equipment',
} as const;

export const DEVICE_CONFIG = {
    [DeviceType.ROUTER]: {
        category: DEVICE_CATEGORIES.NETWORK,
        defaultSize: { width: 80, height: 60 },
        icon: '🔀',
        color: '#FF6B6B',
        ports: [
            { name: 'WAN', type: 'ethernet' },
            { name: 'LAN1', type: 'ethernet' },
            { name: 'LAN2', type: 'ethernet' },
            { name: 'LAN3', type: 'ethernet' },
        ]
    },
    [DeviceType.SWITCH]: {
        category: DEVICE_CATEGORIES.NETWORK,
        defaultSize: { width: 120, height: 40 },
        icon: '🔗',
        color: '#4ECDC4',
        ports: Array.from({ length: 8 }, (_, i) => ({
            name: `Port${i + 1}`,
            type: 'ethernet'
        }))
    },
    [DeviceType.SERVER]: {
        category: DEVICE_CATEGORIES.COMPUTERS,
        defaultSize: { width: 100, height: 80 },
        icon: '🖥️',
        color: '#45B7D1',
        ports: [
            { name: 'ETH1', type: 'ethernet' },
            { name: 'ETH2', type: 'ethernet' },
            { name: 'POWER', type: 'power' },
        ]
    },
    [DeviceType.DESKTOP]: {
        category: DEVICE_CATEGORIES.COMPUTERS,
        defaultSize: { width: 70, height: 70 },
        icon: '🖱️',
        color: '#96CEB4',
        ports: [
            { name: 'ETH', type: 'ethernet' },
            { name: 'USB1', type: 'usb' },
            { name: 'USB2', type: 'usb' },
            { name: 'HDMI', type: 'hdmi' },
        ]
    },
    [DeviceType.LAPTOP]: {
        category: DEVICE_CATEGORIES.COMPUTERS,
        defaultSize: { width: 90, height: 60 },
        icon: '💻',
        color: '#FFEAA7',
        ports: [
            { name: 'WIFI', type: 'wifi' },
            { name: 'ETH', type: 'ethernet' },
            { name: 'USB', type: 'usb' },
        ]
    },
    [DeviceType.PRINTER]: {
        category: DEVICE_CATEGORIES.PERIPHERALS,
        defaultSize: { width: 80, height: 50 },
        icon: '🖨️',
        color: '#DDA0DD',
        ports: [
            { name: 'ETH', type: 'ethernet' },
            { name: 'USB', type: 'usb' },
        ]
    },
    [DeviceType.FIREWALL]: {
        category: DEVICE_CATEGORIES.SECURITY,
        defaultSize: { width: 100, height: 60 },
        icon: '🛡️',
        color: '#FF7675',
        ports: [
            { name: 'WAN', type: 'ethernet' },
            { name: 'LAN', type: 'ethernet' },
            { name: 'DMZ', type: 'ethernet' },
        ]
    },
    [DeviceType.ACCESS_POINT]: {
        category: DEVICE_CATEGORIES.NETWORK,
        defaultSize: { width: 60, height: 60 },
        icon: '📡',
        color: '#74B9FF',
        ports: [
            { name: 'ETH', type: 'ethernet' },
            { name: 'WIFI', type: 'wifi' },
        ]
    },
} as const;

export const DEFAULT_DEVICE_STYLE = {
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 2,
    opacity: 1,
    cornerRadius: 4,
} as const;