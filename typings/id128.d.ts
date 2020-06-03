declare namespace id128 {
    export interface Ulid {
        MIN(): Ulid
        MAX(): Ulid

        compare(rhs: Ulid): number
        equal(rhs: Ulid): boolean
        clone(): Ulid
        time(): Ulid

        bytes(): Int8Array
        construct(bytes: Int8Array): Ulid
        generate(): Ulid

        fromCanonical(canonical: string): Ulid
        fromCanonicalTrusted(canonical: string): Ulid
        fromRaw(raw: string): Ulid
        fromRawTrusted(raw: string): Ulid

        toCanonical(): string
        toRaw(): string
    }
}
