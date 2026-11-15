export interface ToolInfo {
    name: string;
    readOnly: boolean;
}

export interface FilterOptions {
    allow: string[];
    deny: string[];
    readOnly: boolean;
}

function toRegExp(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
}

export function matchesAny(name: string, patterns: string[]): boolean {
    return patterns.some((pattern) => toRegExp(pattern).test(name));
}

/**
 * Decides whether a tool stays registered.
 * Order: read-only mode first, then the allow list (if set), then the deny list.
 */
export function isToolEnabled(tool: ToolInfo, options: FilterOptions): boolean {
    if (options.readOnly && !tool.readOnly) {
        return false;
    }
    if (options.allow.length > 0 && !matchesAny(tool.name, options.allow)) {
        return false;
    }
    return !matchesAny(tool.name, options.deny);
}
