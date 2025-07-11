import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, debounceTime, distinctUntilChanged } from 'rxjs';

import {
    DeviceTemplate,
    DeviceCategory,
    DeviceSubcategory,
    DeviceSearchCriteria,
    DeviceFilter,
    DeviceLibraryState,
    DeviceCreationResult,
    DeviceLibraryConfig,
    DeviceAsset,
    CustomDeviceData,
    DeviceLibraryAnalytics,
    DeviceLibraryEvent,
    DeviceLibraryEventType,
    DeviceSortBy,
    DeviceValidationResult,
    DEFAULT_SUBCATEGORIES,
    DEFAULT_DEVICE_LIBRARY_CONFIG
} from '@core/models/device-library.model';
import { Device, DeviceType, Point } from '@core/models';
import { DEVICE_CONFIG } from '@core/constants';
import { IdUtils, ValidationUtils } from '@shared/utils';

@Injectable({
    providedIn: 'root'
})
export class DeviceLibraryService {

    // === PRIVATE STATE SUBJECTS ===

    private _templates$ = new BehaviorSubject<DeviceTemplate[]>([]);
    private _categories$ = new BehaviorSubject<DeviceSubcategory[]>(DEFAULT_SUBCATEGORIES);
    private _searchCriteria$ = new BehaviorSubject<DeviceSearchCriteria>(this.getDefaultSearchCriteria());
    private _activeFilter$ = new BehaviorSubject<DeviceFilter>(this.getDefaultFilter());
    private _searchResults$ = new BehaviorSubject<DeviceTemplate[]>([]);
    private _selectedTemplate$ = new BehaviorSubject<DeviceTemplate | null>(null);
    private _recentTemplates$ = new BehaviorSubject<DeviceTemplate[]>([]);
    private _favoriteTemplates$ = new BehaviorSubject<DeviceTemplate[]>([]);
    private _isLoading$ = new BehaviorSubject<boolean>(false);
    private _config$ = new BehaviorSubject<DeviceLibraryConfig>(DEFAULT_DEVICE_LIBRARY_CONFIG);
    private _events$ = new BehaviorSubject<DeviceLibraryEvent[]>([]);

    // === PUBLIC OBSERVABLES ===

    /** All device templates */
    public readonly templates$ = this._templates$.asObservable();

    /** Device categories and subcategories */
    public readonly categories$ = this._categories$.asObservable();

    /** Current search criteria */
    public readonly searchCriteria$ = this._searchCriteria$.asObservable();

    /** Active filter state */
    public readonly activeFilter$ = this._activeFilter$.asObservable();

    /** Search results */
    public readonly searchResults$ = this._searchResults$.asObservable();

    /** Selected template */
    public readonly selectedTemplate$ = this._selectedTemplate$.asObservable();

    /** Recent templates */
    public readonly recentTemplates$ = this._recentTemplates$.asObservable();

    /** Favorite templates */
    public readonly favoriteTemplates$ = this._favoriteTemplates$.asObservable();

    /** Loading state */
    public readonly isLoading$ = this._isLoading$.asObservable();

    /** Service configuration */
    public readonly config$ = this._config$.asObservable();

    /** Library events stream */
    public readonly events$ = this._events$.asObservable();

    // === COMPUTED OBSERVABLES ===

    /** Complete library state */
    public readonly libraryState$: Observable<DeviceLibraryState> = combineLatest([
        this._templates$,
        this._categories$,
        this._searchCriteria$,
        this._activeFilter$,
        this._searchResults$,
        this._selectedTemplate$,
        this._recentTemplates$,
        this._favoriteTemplates$,
        this._isLoading$
    ]).pipe(
        map(([templates, categories, searchCriteria, activeFilter, searchResults, selectedTemplate, recentTemplates, favoriteTemplates, isLoading]) => ({
            templates,
            categories,
            searchCriteria,
            activeFilter,
            searchResults,
            selectedTemplate,
            recentTemplates,
            favoriteTemplates,
            isLoading,
            lastUpdate: new Date()
        } as DeviceLibraryState))
    );

    /** Templates by category */
    public readonly templatesByCategory$ = this._templates$.pipe(
        map(templates => {
            const grouped: Record<DeviceCategory, DeviceTemplate[]> = {} as any;
            Object.values(DeviceCategory).forEach(category => {
                grouped[category] = templates.filter(t => t.category === category);
            });
            return grouped;
        })
    );

    /** Total template count */
    public readonly templateCount$ = this._templates$.pipe(
        map(templates => templates.length)
    );

    /** Category counts */
    public readonly categoryCounts$ = this._templates$.pipe(
        map(templates => {
            const counts: Record<DeviceCategory, number> = {} as any;
            Object.values(DeviceCategory).forEach(category => {
                counts[category] = templates.filter(t => t.category === category).length;
            });
            return counts;
        })
    );

    /** Most popular templates */
    public readonly popularTemplates$ = this._templates$.pipe(
        map(templates => [...templates]
            .sort((a, b) => b.usage.popularity - a.usage.popularity)
            .slice(0, 10)
        )
    );

    /** Search query observable with debounce */
    public readonly debouncedSearchQuery$ = this._activeFilter$.pipe(
        map(filter => filter.searchQuery),
        debounceTime(this._config$.value.searchDebounceMs),
        distinctUntilChanged()
    );

    /** Has any filters active */
    public readonly hasActiveFilters$ = this._activeFilter$.pipe(
        map(filter =>
            filter.categories.length > 0 ||
            filter.subcategories.length > 0 ||
            filter.deviceTypes.length > 0 ||
            filter.tags.length > 0 ||
            filter.manufacturers.length > 0 ||
            filter.showFavoritesOnly ||
            filter.showRecentOnly ||
            filter.searchQuery.length > 0
        )
    );

    constructor() {
        this.initializeLibrary();
        this.setupSearchSubscription();
        console.log('🎯 DeviceLibraryService: Service initialized');
    }

    // === TEMPLATE MANAGEMENT ===

    /**
     * Get all templates
     */
    public getTemplates(): DeviceTemplate[] {
        return this._templates$.value;
    }

    /**
     * Get template by ID
     */
    public getTemplate(id: string): DeviceTemplate | null {
        return this._templates$.value.find(t => t.id === id) || null;
    }

    /**
     * Add new template
     */
    public addTemplate(template: DeviceTemplate): boolean {
        try {
            const validation = this.validateTemplate(template);
            if (!validation.isValid) {
                console.error('❌ DeviceLibraryService: Invalid template', validation.errors);
                return false;
            }

            const templates = this._templates$.value;

            // Check for duplicate ID
            if (templates.some(t => t.id === template.id)) {
                console.error('❌ DeviceLibraryService: Template with ID already exists', template.id);
                return false;
            }

            const newTemplates = [...templates, template];
            this._templates$.next(newTemplates);

            this.emitEvent({
                type: DeviceLibraryEventType.TEMPLATE_CREATED,
                templateId: template.id,
                template,
                timestamp: new Date()
            });

            console.log('✅ DeviceLibraryService: Template added:', template.name);
            return true;

        } catch (error) {
            console.error('❌ DeviceLibraryService: Failed to add template', error);
            return false;
        }
    }

    /**
     * Update existing template
     */
    public updateTemplate(id: string, updates: Partial<DeviceTemplate>): boolean {
        try {
            const templates = this._templates$.value;
            const index = templates.findIndex(t => t.id === id);

            if (index === -1) {
                console.error('❌ DeviceLibraryService: Template not found', id);
                return false;
            }

            const updatedTemplate = {
                ...templates[index],
                ...updates,
                updatedAt: new Date()
            };

            const validation = this.validateTemplate(updatedTemplate);
            if (!validation.isValid) {
                console.error('❌ DeviceLibraryService: Invalid template update', validation.errors);
                return false;
            }

            const newTemplates = [...templates];
            newTemplates[index] = updatedTemplate;
            this._templates$.next(newTemplates);

            this.emitEvent({
                type: DeviceLibraryEventType.TEMPLATE_UPDATED,
                templateId: id,
                template: updatedTemplate,
                timestamp: new Date()
            });

            console.log('✅ DeviceLibraryService: Template updated:', updatedTemplate.name);
            return true;

        } catch (error) {
            console.error('❌ DeviceLibraryService: Failed to update template', error);
            return false;
        }
    }

    /**
     * Remove template
     */
    public removeTemplate(id: string): boolean {
        try {
            const templates = this._templates$.value;
            const template = templates.find(t => t.id === id);

            if (!template) {
                console.error('❌ DeviceLibraryService: Template not found', id);
                return false;
            }

            const newTemplates = templates.filter(t => t.id !== id);
            this._templates$.next(newTemplates);

            // Remove from recent and favorites
            this.removeFromRecent(id);
            this.removeFromFavorites(id);

            this.emitEvent({
                type: DeviceLibraryEventType.TEMPLATE_DELETED,
                templateId: id,
                template,
                timestamp: new Date()
            });

            console.log('✅ DeviceLibraryService: Template removed:', template.name);
            return true;

        } catch (error) {
            console.error('❌ DeviceLibraryService: Failed to remove template', error);
            return false;
        }
    }

    // === DEVICE CREATION ===

    /**
     * Create device from template
     */
    public createDeviceFromTemplate(
        templateId: string,
        position: Point,
        customizations?: Partial<Device>
    ): DeviceCreationResult {
        try {
            const template = this.getTemplate(templateId);
            if (!template) {
                return {
                    success: false,
                    error: 'Template not found',
                    message: `Template with ID ${templateId} not found`
                };
            }

            // Create device based on template
            const device: Device = {
                id: IdUtils.generateDeviceId(template.deviceType),
                type: template.deviceType,
                position,
                size: template.defaultSize,
                rotation: 0,
                metadata: {
                    name: `${template.name}_${Date.now()}`,
                    description: template.description,
                    ...template.metadata.manufacturer && { manufacturer: template.metadata.manufacturer },
                    ...template.metadata.model && { model: template.metadata.model },
                    ...template.metadata.specifications && { specifications: template.metadata.specifications },
                    tags: [...template.metadata.tags]
                },
                style: { ...template.defaultStyle },
                ports: template.metadata.ports?.map(portTemplate => ({
                    id: IdUtils.generateUUID(),
                    name: portTemplate.name,
                    type: portTemplate.type as any,
                    position: {
                        x: position.x + portTemplate.offset.x,
                        y: position.y + portTemplate.offset.y
                    },
                    isConnected: false
                })),
                isSelected: false,
                isLocked: false,
                layerIndex: 3, // CANVAS_CONFIG.LAYERS.DEVICES
                createdAt: new Date(),
                updatedAt: new Date(),
                // Apply customizations
                ...customizations
            };

            // Update template usage
            this.updateTemplateUsage(templateId);

            // Add to recent templates
            this.addToRecent(template);

            this.emitEvent({
                type: DeviceLibraryEventType.TEMPLATE_USED,
                templateId,
                template,
                timestamp: new Date(),
                metadata: { deviceId: device.id }
            });

            console.log('✅ DeviceLibraryService: Device created from template:', template.name);

            return {
                success: true,
                device,
                template,
                message: 'Device created successfully'
            };

        } catch (error) {
            console.error('❌ DeviceLibraryService: Failed to create device from template', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Failed to create device'
            };
        }
    }

    /**
     * Create custom device template
     */
    public createCustomTemplate(data: CustomDeviceData): DeviceCreationResult {
        try {
            const validation = this.validateCustomDeviceData(data);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.join(', '),
                    message: 'Invalid custom device data',
                    warnings: validation.warnings
                };
            }

            const template: DeviceTemplate = {
                id: IdUtils.generateUUID(),
                name: data.name,
                description: data.description,
                category: data.category,
                subcategory: data.subcategory,
                deviceType: DeviceType.CUSTOM,
                icon: data.icon,
                defaultSize: data.size,
                defaultStyle: {
                    fill: '#E0E0E0',
                    stroke: '#757575',
                    strokeWidth: 2,
                    opacity: 1,
                    cornerRadius: 4,
                    ...data.style
                },
                metadata: {
                    manufacturer: data.metadata.manufacturer,
                    model: data.metadata.model,
                    specifications: data.metadata.specifications,
                    ports: data.ports,
                    tags: data.metadata.tags,
                    keywords: data.metadata.tags
                },
                assets: {
                    iconUrl: data.assets?.iconFile ? URL.createObjectURL(data.assets.iconFile) : undefined,
                    imageUrl: data.assets?.imageFile ? URL.createObjectURL(data.assets.imageFile) : undefined,
                    svgContent: data.assets?.svgContent
                },
                configuration: {
                    isCustomizable: true,
                    allowStyleOverride: true,
                    allowSizeOverride: true,
                    requiredFields: ['name'],
                    defaultValues: {}
                },
                usage: {
                    popularity: 0,
                    useCount: 0,
                    isFavorite: false
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                version: '1.0.0'
            };

            const success = this.addTemplate(template);
            if (!success) {
                return {
                    success: false,
                    error: 'Failed to add custom template',
                    message: 'Template creation failed'
                };
            }

            return {
                success: true,
                template,
                message: 'Custom device template created successfully'
            };

        } catch (error) {
            console.error('❌ DeviceLibraryService: Failed to create custom template', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Failed to create custom template'
            };
        }
    }

    // === SEARCH AND FILTERING ===

    /**
     * Perform search with criteria
     */
    public search(criteria: Partial<DeviceSearchCriteria>): void {
        const fullCriteria = {
            ...this._searchCriteria$.value,
            ...criteria
        };

        this._searchCriteria$.next(fullCriteria);

        this.emitEvent({
            type: DeviceLibraryEventType.SEARCH_PERFORMED,
            searchCriteria: fullCriteria,
            timestamp: new Date()
        });

        console.log('🔍 DeviceLibraryService: Search performed', fullCriteria);
    }

    /**
     * Update active filter
     */
    public updateFilter(filter: Partial<DeviceFilter>): void {
        const newFilter = {
            ...this._activeFilter$.value,
            ...filter
        };

        this._activeFilter$.next(newFilter);

        this.emitEvent({
            type: DeviceLibraryEventType.FILTER_APPLIED,
            timestamp: new Date(),
            metadata: { filter: newFilter }
        });

        console.log('🔧 DeviceLibraryService: Filter updated', newFilter);
    }

    /**
     * Clear all filters
     */
    public clearFilters(): void {
        this._activeFilter$.next(this.getDefaultFilter());
        this._searchCriteria$.next(this.getDefaultSearchCriteria());
        console.log('🧹 DeviceLibraryService: Filters cleared');
    }

    /**
     * Quick search by text
     */
    public quickSearch(query: string): void {
        this.updateFilter({ searchQuery: query });
    }

    // === FAVORITES AND RECENT ===

    /**
     * Add template to favorites
     */
    public addToFavorites(templateId: string): boolean {
        try {
            const template = this.getTemplate(templateId);
            if (!template) return false;

            const favorites = this._favoriteTemplates$.value;
            const config = this._config$.value;

            if (favorites.some(t => t.id === templateId)) {
                console.log('⭐ DeviceLibraryService: Template already in favorites');
                return true;
            }

            // Update template favorite status
            this.updateTemplate(templateId, {
                usage: { ...template.usage, isFavorite: true }
            });

            // Add to favorites list
            const newFavorites = [template, ...favorites].slice(0, config.maxFavorites);
            this._favoriteTemplates$.next(newFavorites);

            this.emitEvent({
                type: DeviceLibraryEventType.TEMPLATE_FAVORITED,
                templateId,
                template,
                timestamp: new Date()
            });

            console.log('⭐ DeviceLibraryService: Template added to favorites:', template.name);
            return true;

        } catch (error) {
            console.error('❌ DeviceLibraryService: Failed to add to favorites', error);
            return false;
        }
    }

    /**
     * Remove template from favorites
     */
    public removeFromFavorites(templateId: string): boolean {
        try {
            const template = this.getTemplate(templateId);
            if (template) {
                this.updateTemplate(templateId, {
                    usage: { ...template.usage, isFavorite: false }
                });
            }

            const favorites = this._favoriteTemplates$.value.filter(t => t.id !== templateId);
            this._favoriteTemplates$.next(favorites);

            this.emitEvent({
                type: DeviceLibraryEventType.TEMPLATE_UNFAVORITED,
                templateId,
                template: template || undefined,  // ➕ ПОПРАВКА: Convert null to undefined
                timestamp: new Date()
            });

            console.log('💔 DeviceLibraryService: Template removed from favorites');
            return true;

        } catch (error) {
            console.error('❌ DeviceLibraryService: Failed to remove from favorites', error);
            return false;
        }
    }

    /**
     * Add template to recent list
     */
    public addToRecent(template: DeviceTemplate): void {
        const recent = this._recentTemplates$.value;
        const config = this._config$.value;

        // Remove if already exists
        const filtered = recent.filter(t => t.id !== template.id);

        // Add to beginning
        const newRecent = [template, ...filtered].slice(0, config.maxRecentItems);
        this._recentTemplates$.next(newRecent);

        console.log('🕒 DeviceLibraryService: Template added to recent:', template.name);
    }

    /**
     * Remove template from recent list
     */
    public removeFromRecent(templateId: string): void {
        const recent = this._recentTemplates$.value.filter(t => t.id !== templateId);
        this._recentTemplates$.next(recent);
    }

    // === ANALYTICS ===

    /**
     * Get library analytics
     */
    public getAnalytics(): DeviceLibraryAnalytics {
        const templates = this._templates$.value;
        const events = this._events$.value;

        const templatesByCategory: Record<DeviceCategory, number> = {} as any;
        Object.values(DeviceCategory).forEach(category => {
            templatesByCategory[category] = templates.filter(t => t.category === category).length;
        });

        const categoryUsage = Object.entries(templatesByCategory).map(([category, count]) => ({
            category: category as DeviceCategory,
            useCount: count,
            percentage: (count / templates.length) * 100
        }));

        return {
            totalTemplates: templates.length,
            templatesByCategory,
            mostPopularTemplates: [...templates]
                .sort((a, b) => b.usage.popularity - a.usage.popularity)
                .slice(0, 10),
            recentlyAddedTemplates: [...templates]
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 10),
            searchQueries: [], // Would need persistent storage for this
            categoryUsage
        };
    }

    // === PRIVATE HELPER METHODS ===

    private initializeLibrary(): void {
        // Initialize with built-in device templates based on DEVICE_CONFIG
        const builtInTemplates = this.createBuiltInTemplates();
        this._templates$.next(builtInTemplates);

        console.log(`📚 DeviceLibraryService: Initialized with ${builtInTemplates.length} built-in templates`);
    }

    private createBuiltInTemplates(): DeviceTemplate[] {
        const templates: DeviceTemplate[] = [];

        Object.entries(DEVICE_CONFIG).forEach(([deviceType, config]) => {
            const template: DeviceTemplate = {
                id: `builtin_${deviceType}`,
                name: deviceType.charAt(0).toUpperCase() + deviceType.slice(1).replace(/_/g, ' '), // ➕ ПОПРАВКА: Generate name from deviceType
                description: `Built-in ${deviceType} device template`,
                category: this.getDeviceCategory(deviceType as DeviceType),
                deviceType: deviceType as DeviceType,
                icon: config.icon,
                defaultSize: config.defaultSize,
                defaultStyle: {
                    fill: config.color,
                    stroke: '#333',
                    strokeWidth: 2,
                    opacity: 1,
                    cornerRadius: 4
                },
                metadata: {
                    tags: [deviceType, 'built-in'],
                    keywords: [deviceType, deviceType.replace(/_/g, ' ')] // ➕ POПРАВКА: Remove config.name reference
                },
                assets: {
                    // ➕ ПОПРАВКА: Remove config.iconUrl reference since it doesn't exist
                    iconUrl: undefined
                },
                configuration: {
                    isCustomizable: true,
                    allowStyleOverride: true,
                    allowSizeOverride: true
                },
                usage: {
                    popularity: 0,
                    useCount: 0,
                    isFavorite: false
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                version: '1.0.0'
            };

            templates.push(template);
        });

        return templates;
    }

    private getDeviceCategory(deviceType: DeviceType): DeviceCategory {
        const categoryMapping: Record<DeviceType, DeviceCategory> = {
            [DeviceType.ROUTER]: DeviceCategory.NETWORK,
            [DeviceType.SWITCH]: DeviceCategory.NETWORK,
            [DeviceType.ACCESS_POINT]: DeviceCategory.NETWORK,
            [DeviceType.FIREWALL]: DeviceCategory.SECURITY,
            [DeviceType.SERVER]: DeviceCategory.SERVERS,
            [DeviceType.DESKTOP]: DeviceCategory.COMPUTERS,
            [DeviceType.LAPTOP]: DeviceCategory.COMPUTERS,
            [DeviceType.PRINTER]: DeviceCategory.PERIPHERALS,
            [DeviceType.STORAGE]: DeviceCategory.STORAGE,
            [DeviceType.PHONE]: DeviceCategory.MOBILE,
            [DeviceType.TABLET]: DeviceCategory.MOBILE,
            [DeviceType.CUSTOM]: DeviceCategory.CUSTOM
        };

        return categoryMapping[deviceType] || DeviceCategory.CUSTOM;
    }

    private setupSearchSubscription(): void {
        // Reactive search when criteria or filters change
        combineLatest([
            this._templates$,
            this._searchCriteria$,
            this._activeFilter$
        ]).subscribe(([templates, criteria, filter]) => {
            const results = this.performSearch(templates, criteria, filter);
            this._searchResults$.next(results);
        });

        // Debounced search query
        this.debouncedSearchQuery$.subscribe(query => {
            const criteria = this._searchCriteria$.value;
            this._searchCriteria$.next({ ...criteria, query });
        });
    }

    private performSearch(
        templates: DeviceTemplate[],
        criteria: DeviceSearchCriteria,
        filter: DeviceFilter
    ): DeviceTemplate[] {
        let results = [...templates];

        // Apply search query
        if (criteria.query && criteria.query.trim()) {
            const query = criteria.query.toLowerCase();
            results = results.filter(template =>
                template.name.toLowerCase().includes(query) ||
                template.description.toLowerCase().includes(query) ||
                template.metadata.tags.some(tag => tag.toLowerCase().includes(query)) ||
                template.metadata.keywords.some(keyword => keyword.toLowerCase().includes(query))
            );
        }

        // Apply category filter
        if (filter.categories.length > 0) {
            results = results.filter(template => filter.categories.includes(template.category));
        }

        // Apply device type filter
        if (filter.deviceTypes.length > 0) {
            results = results.filter(template => filter.deviceTypes.includes(template.deviceType));
        }

        // Apply favorites filter
        if (filter.showFavoritesOnly) {
            results = results.filter(template => template.usage.isFavorite);
        }

        // Apply recent filter
        if (filter.showRecentOnly) {
            const recentIds = this._recentTemplates$.value.map(t => t.id);
            results = results.filter(template => recentIds.includes(template.id));
        }

        // Apply sorting
        results.sort((a, b) => {
            const order = criteria.sortOrder === 'desc' ? -1 : 1;

            switch (criteria.sortBy) {
                case DeviceSortBy.NAME:
                    return a.name.localeCompare(b.name) * order;
                case DeviceSortBy.POPULARITY:
                    return (a.usage.popularity - b.usage.popularity) * order;
                case DeviceSortBy.LAST_USED:
                    const aDate = a.usage.lastUsed?.getTime() || 0;
                    const bDate = b.usage.lastUsed?.getTime() || 0;
                    return (aDate - bDate) * order;
                case DeviceSortBy.CREATED_AT:
                    return (a.createdAt.getTime() - b.createdAt.getTime()) * order;
                case DeviceSortBy.USE_COUNT:
                    return (a.usage.useCount - b.usage.useCount) * order;
                default:
                    return 0;
            }
        });

        // Apply pagination
        if (criteria.limit) {
            const start = criteria.offset || 0;
            results = results.slice(start, start + criteria.limit);
        }

        return results;
    }

    private updateTemplateUsage(templateId: string): void {
        const template = this.getTemplate(templateId);
        if (template) {
            this.updateTemplate(templateId, {
                usage: {
                    ...template.usage,
                    popularity: template.usage.popularity + 1,
                    useCount: template.usage.useCount + 1,
                    lastUsed: new Date()
                }
            });
        }
    }

    private validateTemplate(template: DeviceTemplate): DeviceValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!template.id) errors.push('Template ID is required');
        if (!template.name || template.name.trim().length === 0) errors.push('Template name is required');
        if (!template.deviceType) errors.push('Device type is required');
        if (!template.category) errors.push('Category is required');
        if (!template.defaultSize || template.defaultSize.width <= 0 || template.defaultSize.height <= 0) {
            errors.push('Valid default size is required');
        }

        if (template.name && template.name.length > 100) warnings.push('Template name is very long');
        if (template.metadata.tags.length === 0) warnings.push('Consider adding tags for better searchability');

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private validateCustomDeviceData(data: CustomDeviceData): DeviceValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!data.name || data.name.trim().length === 0) errors.push('Device name is required');
        if (!data.category) errors.push('Device category is required');
        if (!data.size || data.size.width <= 0 || data.size.height <= 0) errors.push('Valid size is required');

        if (data.name && data.name.length > 100) warnings.push('Device name is very long');
        if (!data.description) warnings.push('Consider adding a description');

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private emitEvent(event: DeviceLibraryEvent): void {
        const events = this._events$.value;
        const newEvents = [event, ...events].slice(0, 100); // Keep last 100 events
        this._events$.next(newEvents);
    }

    private getDefaultSearchCriteria(): DeviceSearchCriteria {
        return {
            sortBy: DeviceSortBy.NAME,
            sortOrder: 'asc',
            limit: 50,
            offset: 0
        };
    }

    private getDefaultFilter(): DeviceFilter {
        return {
            categories: [],
            subcategories: [],
            deviceTypes: [],
            tags: [],
            manufacturers: [],
            showFavoritesOnly: false,
            showRecentOnly: false,
            searchQuery: ''
        };
    }
}