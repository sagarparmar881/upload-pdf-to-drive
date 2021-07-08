# Upload PDF to Google Drive
This GitHub action is designed to upload pdf to drive.

## Setup

1. Create a Google Cloud Project 
2. Select `API & Services` from left nav -> Select `Library` tab -> Enable `Google Drive API`
3. Return to `API & Services` -> Select `Credentials` tab -> Select `Create Credentials` from top -> Choose `Service Account` -> Create one
4. Select the service account -> Select `Keys` -> Create new key -> Select JSON -> Download JSON to local machine
5. Generate a base64 encoded string of the credentials json -> Run command in your terminal `base64 /local/path/to/credentials.json` -> Copy the base64 encoded string and create a secret in your GitHub repo with name `SVC_ACC_BASE64` and value as the base64 encoded string.
6. Copy the service account email -> Create a folder in your drive or select an existing folder -> Share it with the service account email -> Copy the Folder ID from url 

```yaml
name: Latex CI

on: [push, workflow_dispatch]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Clone Repo
        uses: actions/checkout@v2
      - name: Compile LaTeX document
        uses: xu-cheng/latex-action@v2
        with:
          root_file: main.tex
          compiler: pdflatex
      - name: Upload PDF to Google Drive
        uses: baymac/upload-pdf-to-drive@main
        with:
          target: main.pdf
          credentials: ${{ secrets.SVC_ACC_BASE64 }}
          folderId: <YOUR_DRIVE_FOLDER_ID>
          filename: <ANY_CUSTOM_NAME_WITHOUT_EXTENSION> # optional (defaults to upload.pdf)
          overwrite: <OVERWRITE_FILE_OR_NOT> # optional (defaults to not overwrite)
```
