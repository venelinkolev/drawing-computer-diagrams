import { Point, Size } from '@core/models';

export class MathUtils {

    /**
     * Calculate distance between two points
     */
    static distance(p1: Point, p2: Point): number {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate angle between two points in radians
     */
    static angle(p1: Point, p2: Point): number {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    /**
     * Rotate point around center
     */
    static rotatePoint(point: Point, center: Point, angle: number): Point {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - center.x;
        const dy = point.y - center.y;

        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos,
        };
    }

    /**
     * Snap point to grid
     */
    static snapToGrid(point: Point, gridSize: number): Point {
        return {
            x: Math.round(point.x / gridSize) * gridSize,
            y: Math.round(point.y / gridSize) * gridSize,
        };
    }

    /**
     * Check if point is inside rectangle
     */
    static isPointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
        return (
            point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height
        );
    }

    /**
     * Calculate bounding box for points
     */
    static getBoundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
        if (points.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }

    /**
     * Clamp value between min and max
     */
    static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Linear interpolation
     */
    static lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }
}