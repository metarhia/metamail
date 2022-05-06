export interface Transport {}

export function smtp(host: string, port?: number): Transport;
