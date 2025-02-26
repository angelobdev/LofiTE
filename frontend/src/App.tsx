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
  Button,
  Code,
  CopyButton,
  Divider,
  Flex,
  Image,
  Modal,
  ScrollArea,
  TextInput
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import "./App.css";
import logo from "./assets/automerge.png";
import Editor from "./components/Editor";
import IndexedDBHelper, { FileEntry } from "./helpers/idb.helper";
import RepoHelper from "./helpers/repo.helper";
import { RichText } from "./model/rich-text";

export default function App() {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);

  const repo = useRepo();
  const [documentId, setDocumentId] = useState<AnyDocumentId>();
  const [collabUrl, setCollabUrl] = useState<string>();

  // Input
  const [fileName, setFileName] = useState("");

  // Modal
  const [isCreateOpened, { open: openCreateModal, close: closeCreateModal }] =
    useDisclosure(false);
  const [isLoadOpened, { open: openLoadModal, close: closeLoadModal }] =
    useDisclosure(false);
  const [isCollabOpened, { open: openCollabModal, close: closeCollabModal }] =
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
        <Flex dir="row" gap="md" justify={"center"} align={"center"}>
          <Image src={logo} h="3rem" fit="contain" />
          <h1>LoFi Text Editor</h1>
        </Flex>
        <Divider w={"90%"} mb="2rem" />
        <Flex dir="row" gap="md">
          <Button variant="gradient" onClick={openCreateModal}>
            <i className="fa fa-circle-plus"></i>
            Nuovo
          </Button>
          <Button variant="gradient" onClick={openLoadModal}>
            <i className="fa fa-upload"></i>
            Carica
          </Button>
          <Button variant="gradient" onClick={openCollabModal}>
            <i className="fa fa-users"></i>
            Collabora
          </Button>
        </Flex>

        {documentId && (
          <Flex w="90%" my="1rem" direction="column">
            <Editor docUrl={documentId} />
          </Flex>
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
            <Flex w={"100%"} mb="lg" justify={"space-between"} align={"center"}>
              <Code py="0.5rem" w="70%">
                {stringifyAutomergeUrl(documentId as DocumentId)}
              </Code>
              <CopyButton
                value={stringifyAutomergeUrl(documentId as DocumentId)}
              >
                {({ copied, copy }) => (
                  <Button
                    h="2rem"
                    color={copied ? "teal" : "blue"}
                    onClick={copy}
                  >
                    {copied ? "Copiato" : "Copia URL"}
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
    </>
  );
}
