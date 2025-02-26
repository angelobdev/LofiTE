import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import RepoHelper from "./helpers/repo.helper.tsx";
import App from "./App.tsx";

const theme = createTheme({});

RepoHelper.initialize();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RepoContext.Provider value={RepoHelper.getRepo()}>
      <MantineProvider theme={theme}>
        <App />
      </MantineProvider>
    </RepoContext.Provider>
  </React.StrictMode>
);
