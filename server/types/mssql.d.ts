/** Khai bao module mssql (khong co @types chinh thuc tuong thich). */
declare module 'mssql' {
  export interface IColumnValue {
    [column: string]: unknown;
  }
  export interface IResultAny {
    recordset?: any[];
    rowsAffected?: number[];
  }
  export interface ConnectionPool {
    request(): any;
    connect(): Promise<ConnectionPool>;
    close(): Promise<void>;
  }
  export class ConnectionPool {
    constructor(config: unknown);
  }
  const _default: {
    ConnectionPool: typeof ConnectionPool;
  };
  export default _default;
}

declare module 'mssql/msnodesqlv8' {
  export interface ConnectionPool {
    request(): any;
    connect(): Promise<ConnectionPool>;
    close(): Promise<void>;
  }
  export class ConnectionPool {
    constructor(config: unknown);
  }
  const _default: {
    ConnectionPool: typeof ConnectionPool;
  };
  export default _default;
}
