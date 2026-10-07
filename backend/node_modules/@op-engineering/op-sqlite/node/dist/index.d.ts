import type { DB, DBParams, OPSQLiteProxy } from "./types";
export { NodeDatabase as Database } from "./database";
export type { BatchQueryResult, ColumnMetadata, DB, DBParams, FileLoadResult, OPSQLiteProxy, PreparedStatement, QueryResult, Scalar, SQLBatchTuple, Transaction, UpdateHookOperation, } from "./types";
declare class OPSQLiteProxyImpl implements OPSQLiteProxy {
    open(options: {
        name: string;
        location?: string;
        encryptionKey?: string;
    }): DB;
    openV2(options: {
        path: string;
        encryptionKey?: string;
    }): DB;
    openRemote(options: {
        url: string;
        authToken: string;
    }): DB;
    openSync(options: DBParams): DB;
    isSQLCipher(): boolean;
    isLibsql(): boolean;
    isTurso(): boolean;
    isIOSEmbedded(): boolean;
}
declare const proxy: OPSQLiteProxyImpl;
export declare const open: (options: {
    name: string;
    location?: string;
    encryptionKey?: string;
}) => DB;
export declare const openV2: (options: {
    path: string;
    encryptionKey?: string;
}) => DB;
export declare const openRemote: (options: {
    url: string;
    authToken: string;
}) => DB;
export declare const openSync: (options: DBParams) => DB;
export declare const isSQLCipher: () => boolean;
export declare const isLibsql: () => boolean;
export declare const isTurso: () => boolean;
export declare const isIOSEmbedded: () => boolean;
export default proxy;
//# sourceMappingURL=index.d.ts.map