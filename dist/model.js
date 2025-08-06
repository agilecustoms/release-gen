export class ReleaseError extends Error {
    constructor(message, cause) {
        super(message, { cause });
        this.name = 'ReleaseError';
    }
}
