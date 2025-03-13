import session from "express-session";
import Keycloak, { KeycloakConfig } from "keycloak-connect";

export const memoryStore = new session.MemoryStore();

const kcConfig: KeycloakConfig = {
  "auth-server-url": "http://localhost:8080",
  realm: "lofite",
  resource: "react-client",
  "ssl-required": "none",
  "confidential-port": 0,
};

export const keycloak = new Keycloak({ store: memoryStore }, kcConfig);
