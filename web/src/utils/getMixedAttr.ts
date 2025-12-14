export function getMixedAttr<T>(items: T[], getAttr: (item: T) => any, defaultValue: any): any | null {
    if (items.length === 0) {
        return defaultValue || null;
    } else if (items.length === 1) {
        return getAttr(items[0])
    } else {
        for (let i = 1; i < items.length; i++) {
            if (getAttr(items[i]) !== getAttr(items[i - 1])) {
                return defaultValue || null;
            }
        }

        return getAttr(items[0])
    }
}

export function isMixedAttr<T>(items: T[], getAttr: (item: T) => any): boolean {
    if (items.length <= 1) {
        return false;
    } else {
        for (let i = 1; i < items.length; i++) {
            if (getAttr(items[i]) !== getAttr(items[i - 1])) {
                return true;
            }
        }
    }

    return false;
}