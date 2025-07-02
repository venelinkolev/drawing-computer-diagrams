export class IdUtils {

    /**
     * Generate UUID v4
     */
    static generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Generate short ID for UI elements
     */
    static generateShortId(prefix: string = ''): string {
        const id = Math.random().toString(36).substr(2, 9);
        return prefix ? `${prefix}_${id}` : id;
    }

    /**
     * Generate device ID
     */
    static generateDeviceId(type: string): string {
        return this.generateShortId(type.toLowerCase());
    }

    /**
     * Generate connection ID
     */
    static generateConnectionId(): string {
        return this.generateShortId('conn');
    }

    /**
     * Generate project ID
     */
    static generateProjectId(): string {
        return this.generateUUID();
    }
}