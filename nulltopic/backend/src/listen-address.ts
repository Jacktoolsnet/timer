import {isIP} from 'node:net';

/** Network exposure is explicit; ordinary development stays loopback-only. */
export function backendHost(value: string | undefined): string {
  if(value === undefined) return '127.0.0.1';
  if(!isIP(value)) throw Error('BACKEND_HOST must be an IPv4 or IPv6 address');
  return value;
}
