import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DriverIconProps {
  className?: string;
}

function BrandIcon({
  className,
  children,
}: DriverIconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} aria-hidden>
      {children}
    </svg>
  );
}

export function PostgresIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <ellipse cx="32" cy="36" rx="22" ry="16" fill="#336791" />
      <ellipse cx="32" cy="30" rx="18" ry="13" fill="#4A90B8" />
      <circle cx="44" cy="22" r="4" fill="#336791" />
      <circle cx="26" cy="28" r="2" fill="#1E3A4F" />
    </BrandIcon>
  );
}

export function MysqlIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <path d="M12 38c8-10 18-16 28-18 6-1 12 0 16 3-8 2-16 8-22 16-4 5-8 10-14 14-4-3-6-9-8-15z" fill="#00758F" />
      <path d="M18 34c6-8 14-14 24-16 4-1 8 0 12 2-6 2-12 6-18 12-3 4-6 8-10 11-3-2-5-6-8-9z" fill="#F29111" />
    </BrandIcon>
  );
}

export function SqliteIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <path d="M32 8c-8 0-14 6-16 14l-2 18c0 8 8 14 18 14s18-6 18-14l-2-18C46 14 40 8 32 8z" fill="#003B57" />
      <path d="M32 12c-6 0-11 5-12 11l-1 15c0 6 6 11 13 11s13-5 13-11l-1-15C43 17 38 12 32 12z" fill="#0EA5D9" />
    </BrandIcon>
  );
}

export function MariaDbIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <circle cx="32" cy="32" r="18" fill="#1F305E" />
      <path d="M20 34c6-8 12-12 20-12s14 4 20 12" stroke="#C49A6C" strokeWidth="3" fill="none" />
    </BrandIcon>
  );
}

export function SqlServerIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <rect x="14" y="14" width="36" height="36" rx="4" fill="#CC2927" />
      <path d="M22 24h20v4H22zm0 8h20v4H22zm0 8h14v4H22z" fill="#fff" />
    </BrandIcon>
  );
}

export function OracleIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <path d="M12 42c8-16 16-24 32-24s24 8 32 24H12z" fill="#F80000" />
      <ellipse cx="32" cy="42" rx="28" ry="6" fill="#C74634" />
    </BrandIcon>
  );
}

export function MongoDbIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <path d="M32 10c-6 8-10 18-10 28 0 8 4 14 10 16 6-2 10-8 10-16 0-10-4-20-10-28z" fill="#47A248" />
    </BrandIcon>
  );
}

export function RedisIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <path d="M32 12 12 22l20 10 20-10L32 12zm-16 18v12l16 8 16-8V30L32 38 16 30z" fill="#D82C20" />
    </BrandIcon>
  );
}

export function CassandraIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <circle cx="32" cy="32" r="18" fill="#1287B1" />
      <path d="M32 16v32M16 32h32" stroke="#fff" strokeWidth="3" />
    </BrandIcon>
  );
}

export function CouchbaseIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <circle cx="32" cy="32" r="18" fill="#EA2328" />
      <path d="M20 32c4-8 8-12 12-12s8 4 12 12" stroke="#fff" strokeWidth="3" fill="none" />
    </BrandIcon>
  );
}

export function ClickHouseIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <rect x="18" y="16" width="8" height="32" fill="#FFCC00" />
      <rect x="28" y="22" width="8" height="26" fill="#FFCC00" />
      <rect x="38" y="18" width="8" height="30" fill="#FFCC00" />
    </BrandIcon>
  );
}

export function DuckDbIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <circle cx="32" cy="32" r="18" fill="#FFF000" />
      <path d="M24 28h16v8H24z" fill="#000" />
    </BrandIcon>
  );
}

export function Neo4jIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <circle cx="24" cy="24" r="6" fill="#018BFF" />
      <circle cx="40" cy="24" r="6" fill="#018BFF" />
      <circle cx="32" cy="40" r="6" fill="#018BFF" />
      <path d="M28 26l4 10M36 26l-4 10M30 24h4" stroke="#018BFF" strokeWidth="2" />
    </BrandIcon>
  );
}

export function InfluxDbIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <path d="M16 44V20l16-8 16 8v24l-16 8-16-8z" fill="#22ADF6" />
    </BrandIcon>
  );
}

export function CsvIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <rect x="16" y="12" width="32" height="40" rx="3" fill="#6B7280" />
      <path d="M22 24h20M22 32h20M22 40h12" stroke="#fff" strokeWidth="2" />
    </BrandIcon>
  );
}

export function ParquetIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <rect x="16" y="12" width="32" height="40" rx="3" fill="#50AF95" />
      <path d="M22 22h8v8h-8zm10 0h8v8h-8zm-10 10h8v8h-8z" fill="#fff" />
    </BrandIcon>
  );
}

export function HiveIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <rect x="14" y="18" width="36" height="28" rx="4" fill="#FDEE21" />
      <path d="M20 28h24M20 36h24" stroke="#000" strokeWidth="2" />
    </BrandIcon>
  );
}

export function ElasticsearchIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <circle cx="32" cy="32" r="18" fill="#005571" />
      <path d="M24 32c0-4 4-8 8-8s8 4 8 8-4 8-8 8" stroke="#FEC514" strokeWidth="3" fill="none" />
    </BrandIcon>
  );
}

export function FirebaseIcon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <path d="M32 12 18 44h12l2-12 8 12h12L32 12z" fill="#FFCA28" />
      <path d="M32 12 26 32h12L32 12z" fill="#FFA000" />
    </BrandIcon>
  );
}

export function S3Icon({ className }: DriverIconProps) {
  return (
    <BrandIcon className={className}>
      <path d="M32 14c-10 0-18 4-18 8v20c0 4 8 8 18 8s18-4 18-8V22c0-4-8-8-18-8z" fill="#569A31" />
      <ellipse cx="32" cy="22" rx="18" ry="8" fill="#8BC34A" />
    </BrandIcon>
  );
}
