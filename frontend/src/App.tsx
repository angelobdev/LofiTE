import {
  AnyDocumentId,
  AutomergeUrl,
  DocumentId,
  isValidAutomergeUrl,
  isValidDocumentId,
  stringifyAutomergeUrl,
} from "@automerge/automerge-repo";
import { useRepo } from "@automerge/automerge-repo-react-hooks";
import {
  Avatar,
  Button,
  Code,
  CopyButton,
  Divider,
  Flex,
  Image,
  Menu,
  Modal,
  ScrollArea,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import "./App.css";
import logo from "./assets/automerge.png";
import Editor from "./components/Editor";
import { saveFile } from "./helpers/FileHelper";
import IndexedDBHelper, { FileEntry } from "./helpers/IndexedDBHelper";
import RepoHelper from "./helpers/RepoHelper";
import { RichText } from "./model/RichText";

export default function App() {
  const { user, isAuthenticated, signinPopup, signoutRedirect } = useAuth();

  const [selectedFileName, setSelectedFileName] = useState<string>();
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);

  const repo = useRepo();
  const [documentId, setDocumentId] = useState<AnyDocumentId>();
  const [collabUrl, setCollabUrl] = useState<string>();

  // Input
  const [fileName, setFileName] = useState("");

  // Menu
  const [menuOpened, setMenuOpened] = useState(false);
  const [profileOpened, setProfileOpened] = useState(false);

  // Modal
  const [isCreateOpened, { open: openCreateModal, close: closeCreateModal }] =
    useDisclosure(false);
  const [isLoadOpened, { open: openLoadModal, close: closeLoadModal }] =
    useDisclosure(false);
  const [isCollabOpened, { open: openCollabModal, close: closeCollabModal }] =
    useDisclosure(false);
  const [isSaveOpened, { open: openSaveModal, close: closeSaveModal }] =
    useDisclosure(false);

  // Carico chiavi salvate
  useEffect(() => {
    IndexedDBHelper.loadAll()
      .then((entries) => {
        setFileEntries(entries);
      })
      .catch((error) => {
        alert(error);
      });
  }, [repo, isLoadOpened]);

  return (
    <>
      <Flex
        w="100%"
        h="100vh"
        justify="start"
        align="center"
        direction="column"
        mt="1rem"
      >
        <Flex
          w="80%"
          dir="row"
          gap="md"
          justify={"space-between"}
          align={"center"}
        >
          <Image src={logo} h="3rem" fit="contain" />
          <h1 style={{ marginRight: "auto" }}>LoFi Text Editor</h1>
          {isAuthenticated ? (
            <>
              <Menu opened={profileOpened} onChange={setProfileOpened}>
                <Menu.Target>
                  <Avatar src={null} style={{ cursor: "pointer" }}></Avatar>
                </Menu.Target>

                <Menu.Dropdown w={"20%"}>
                  <Menu.Label>Ciao {user?.profile.given_name}!</Menu.Label>
                  <Menu.Item
                    color="red"
                    onClick={() => signoutRedirect()}
                    leftSection={<i className="fa fa-right-from-bracket"></i>}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              <Menu opened={menuOpened} onChange={setMenuOpened}>
                <Menu.Target>
                  <Button variant="subtle">
                    <i className="fa fa-bars" style={{ fontSize: "1.4rem" }} />
                  </Button>
                </Menu.Target>

                <Menu.Dropdown w={"20%"}>
                  <Menu.Label>Applicazione</Menu.Label>
                  <Menu.Item
                    onClick={openCreateModal}
                    leftSection={<i className="fa fa-circle-plus"></i>}
                  >
                    Nuovo
                  </Menu.Item>
                  <Menu.Item
                    onClick={openLoadModal}
                    leftSection={<i className="fa fa-upload"></i>}
                  >
                    Carica
                  </Menu.Item>
                  <Menu.Item
                    onClick={openCollabModal}
                    leftSection={<i className="fa fa-users"></i>}
                  >
                    Collabora
                  </Menu.Item>

                  {documentId && (
                    <>
                      <Menu.Label>Documento</Menu.Label>
                      <Menu.Item
                        onClick={() => {
                          const handle = repo.find<RichText>(documentId);
                          handle.whenReady().then(() => {
                            handle.doc().then((doc) => {
                              const data = JSON.stringify(doc?.data, null, 2);

                              const blob = new Blob(
                                [data.substring(1, data.length - 1)],
                                { type: "application/md" }
                              );

                              saveFile(`${selectedFileName!}.md`, blob);
                            });
                          });
                        }}
                        leftSection={<i className="fa fa-download"></i>}
                      >
                        Scarica
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        onClick={() => {
                          setDocumentId(undefined);
                          RepoHelper.removeById(documentId as DocumentId);
                          IndexedDBHelper.remove(selectedFileName!);
                        }}
                        leftSection={<i className="fa fa-trash"></i>}
                      >
                        Elimina
                      </Menu.Item>
                    </>
                  )}
                </Menu.Dropdown>
              </Menu>
            </>
          ) : (
            <Button onClick={() => signinPopup()} variant="gradient">
              Login
            </Button>
          )}
        </Flex>
        <Divider w={"90%"} mb="2rem" />
        {documentId && (
          <>
            <Flex direction={"row"} w={"100%"} justify={"space-between"}>
              <small style={{ marginRight: "auto", marginLeft: "5%" }}>
                {selectedFileName ? (
                  `${selectedFileName}.md`
                ) : (
                  <Flex
                    direction={"row"}
                    justify={"center"}
                    align={"center"}
                    gap={"sm"}
                  >
                    <p>File non salvato!</p>
                    <a className="save" onClick={openSaveModal}>
                      Salva ora
                    </a>
                  </Flex>
                )}
              </small>
            </Flex>
            <Flex w="90%" my="1rem" direction="column">
              <Editor docUrl={documentId} />
            </Flex>
          </>
        )}
      </Flex>

      {/* NUOVO DOCUMENTO */}
      <Modal opened={isCreateOpened} onClose={closeCreateModal} title="Nuovo">
        <TextInput
          label="Nome File"
          placeholder="ISEE 2024"
          value={fileName}
          onChange={(event) => setFileName(event.currentTarget.value)}
        />
        <Button
          w="100%"
          mt="sm"
          onClick={() => {
            const newDoc = repo.create<RichText>({ data: "" });
            setDocumentId(newDoc.documentId);

            IndexedDBHelper.store({
              fileName: fileName,
              docId: newDoc.documentId,
            }).catch((error) => {
              alert(error);
            });

            setSelectedFileName(fileName);
            closeCreateModal();
          }}
        >
          Crea
        </Button>
      </Modal>

      {/* CARICA DOCUMENTO */}
      <Modal
        opened={isLoadOpened}
        onClose={closeLoadModal}
        title="Carica"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {fileEntries.map((entry) => (
          <Flex w={"100%"} gap={"sm"} key={entry.docId as string}>
            <Button
              w="100%"
              mb="sm"
              onClick={() => {
                if (isValidDocumentId(entry.docId as string)) {
                  setDocumentId(entry.docId);
                  setSelectedFileName(entry.fileName);
                  closeLoadModal();
                } else {
                  alert("Documento non valido");
                }
              }}
            >
              {entry.fileName}
            </Button>
            <Button
              color="red"
              onClick={() => {
                RepoHelper.removeById(entry.docId as DocumentId);
                IndexedDBHelper.remove(entry.fileName).then(() => {
                  closeLoadModal();
                });
              }}
            >
              <i className="fa fa-trash" />
            </Button>
          </Flex>
        ))}
        {fileEntries.length === 0 && <p>Non ci sono documenti salvati</p>}
      </Modal>

      {/* COLLABORAZIONE DOCUMENTO */}
      <Modal
        opened={isCollabOpened}
        onClose={closeCollabModal}
        title="Collabora"
      >
        {documentId && (
          <>
            <p>Per collaborare condividi il seguente URL:</p>
            <Flex
              w={"100%"}
              mb="lg"
              justify={"space-between"}
              align={"center"}
              gap="sm"
            >
              <Code py="0.5rem" w="100%">
                {stringifyAutomergeUrl(documentId as DocumentId)}
              </Code>
              <CopyButton
                value={stringifyAutomergeUrl(documentId as DocumentId)}
              >
                {({ copied, copy }) => (
                  <Button h="2rem" onClick={copy} variant="gradient">
                    {copied ? (
                      <i className="fa fa-check"></i>
                    ) : (
                      <i className="fa fa-copy"></i>
                    )}
                  </Button>
                )}
              </CopyButton>
            </Flex>
            <Divider w="100%" my="lg" />
          </>
        )}
        <TextInput
          label="URL Condiviso"
          description="Per collaborare incolla l'URL condiviso qui"
          onChange={($event) => {
            setCollabUrl($event.target.value);
          }}
        ></TextInput>
        <Button
          w="100%"
          mt="1rem"
          variant="gradient"
          onClick={() => {
            if (isValidAutomergeUrl(collabUrl as string)) {
              const url = collabUrl as AutomergeUrl;

              const doc = repo.find<RichText>(url);
              if (doc) {
                setDocumentId(doc.documentId);
                closeCollabModal();
              } else {
                alert("Documento non trovato");
              }
            } else {
              alert("URL non valido");
            }
          }}
        >
          Join
        </Button>
      </Modal>

      {/* SALVA DOCUMENTO APERTO*/}
      <Modal opened={isSaveOpened} onClose={closeSaveModal} title="Salva">
        <TextInput
          label="Nome File"
          placeholder="ISEE 2024"
          value={fileName}
          onChange={(event) => setFileName(event.currentTarget.value)}
        />
        <Button
          w="100%"
          mt="sm"
          onClick={() => {
            IndexedDBHelper.store({
              fileName: fileName,
              docId: documentId!,
            }).catch((error) => {
              alert(error);
            });

            setSelectedFileName(fileName);
            closeSaveModal();
          }}
        >
          Crea
        </Button>
      </Modal>
    </>
  );
}
