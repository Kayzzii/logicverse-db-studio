import { ConnectionInput } from "@/lib/tauri";

export const DRIVER_DEFAULTS: Record<string, Partial<ConnectionInput>> = {
  postgres: {
    driver: "postgres",
    host: "localhost",
    port: 5432,
    database: "postgres",
    username: "postgres",
    sslMode: "prefer",
  },
  mysql: {
    driver: "mysql",
    host: "localhost",
    port: 3306,
    database: "mysql",
    username: "root",
    sslMode: "prefer",
  },
  sqlite: {
    driver: "sqlite",
    host: "",
    port: 0,
    database: "",
    username: "",
    password: "",
    sslMode: "prefer",
    sshEnabled: false,
  },
};

export function getDriverLabel(driver: string): string {
  switch (driver) {
    case "postgres":
      return "PostgreSQL";
    case "mysql":
      return "MySQL";
    case "sqlite":
      return "SQLite";
    default:
      return driver.toUpperCase();
  }
}

export const defaultForm = (): ConnectionInput => ({
  name: "",
  driver: "postgres",
  host: "localhost",
  port: 5432,
  database: "postgres",
  username: "postgres",
  password: "",
  sslMode: "prefer",
  sshEnabled: false,
  sshHost: "",
  sshPort: 22,
  sshUser: "",
  sshPassword: "",
  sshKeyPath: "",
});
