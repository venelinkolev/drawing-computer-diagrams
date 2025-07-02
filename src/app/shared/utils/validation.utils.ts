export class ValidationUtils {

    /**
     * Validate IP address (IPv4)
     */
    static isValidIPv4(ip: string): boolean {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(ip);
    }

    /**
     * Validate MAC address
     */
    static isValidMAC(mac: string): boolean {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac);
    }

    /**
     * Validate project name
     */
    static isValidProjectName(name: string): boolean {
        return name.length >= 1 && name.length <= 50 && /^[a-zA-Z0-9\s\-_]+$/.test(name);
    }

    /**
     * Validate device name
     */
    static isValidDeviceName(name: string): boolean {
        return name.length >= 1 && name.length <= 30;
    }

    /**
     * Check if string is empty or whitespace
     */
    static isEmpty(value: string | null | undefined): boolean {
        return !value || value.trim().length === 0;
    }

    /**
     * Validate VLAN ID
     */
    static isValidVLAN(vlanId: number): boolean {
        return Number.isInteger(vlanId) && vlanId >= 1 && vlanId <= 4094;
    }
}