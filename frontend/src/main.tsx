import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import RepoHelper from "./helpers/repo.helper.tsx";
import App from "./App.tsx";
import { AuthProvider, AuthProviderProps } from "react-oidc-context";

const keycloakConfig: AuthProviderProps = {
  authority: 'http://localhost:8080/realms/lofite',
  client_id: 'react-client',
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
};

const theme = createTheme({});

RepoHelper.initialize();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider {...keycloakConfig}>
      <RepoContext.Provider value={RepoHelper.getRepo()}>
        <MantineProvider theme={theme}>
          <App />
        </MantineProvider>
      </RepoContext.Provider>
    </AuthProvider>
  </React.StrictMode>
);
