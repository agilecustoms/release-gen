export const VALID_VERSION_BUMPS = ['', 'default-minor', 'default-patch'];
export class ReleaseError extends Error {
    constructor(message, cause) {
        super(message, { cause });
        this.name = 'ReleaseError';
    }
}
