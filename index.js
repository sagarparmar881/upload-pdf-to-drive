const actions = require('@actions/core');
const { google } = require('googleapis');
const fs = require('fs');

/** Google Service Account credentials  encoded in base64 */
const credentials = actions.getInput('credentials', { required: true });
/** Google Drive Folder ID to upload the file/folder to */
const folderId = actions.getInput('folderId', { required: true });
/** Local path to the file/folder to upload */
const target = actions.getInput('target', { required: true });
/** Optional name for the pdf file */
const filename = actions.getInput('filename', { required: false });
/** Optional should overwrite or not */
const overwrite = actions.getInput('overwrite', { required: false });
/** Link to the Drive folder */
const link = 'link';

const credentialsJSON = JSON.parse(Buffer.from(credentials, 'base64').toString());
const scopes = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.JWT(credentialsJSON.client_email, null, credentialsJSON.private_key, scopes);
const drive = google.drive({ version: 'v3', auth });

const driveLink = `https://drive.google.com/drive/folders/${folderId}`

async function main() {
  actions.setOutput(link, driveLink);
  uploadToDrive();
}

function getFileName() {
  return filename.length > 0 ? `${filename}.pdf` : 'upload.pdf'
}

function fileIdIfExists() {
  getfilelist.GetFileList(
    {
      auth: auth,
      fields: "files(name, id)",
      id: folderId,
    },
    (err, res) => {
      if (err) {
        console.log(err);
        return;
      }
      const fileList = res.fileList.flatMap(({ files }) => files);
      return fileList.find(file => file.name === filename)
    }
  );
}

function create(fileMetadata, media) {
  drive.files.create({
    requestBody: fileMetadata,
    media: media
  }).then(() => actions.info('File uploaded successfully'))
    .catch(e => {
      actions.error('Upload failed');
      throw e;
    });
}

function update(fileId, fileMetadata, media) {
  drive.files.update({
    fileId: fileId,
    requestBody: fileMetadata,
    media: media
  }).then(() => actions.info('File uploaded successfully'))
    .catch(e => {
      actions.error('Upload failed');
      throw e;
    });
}

/**
 * Uploads the file to Google Drive
 */
function uploadToDrive() {
  actions.info('Uploading file to Goole Drive...');
  var fileMetadata = {
    name: getFileName(),
    parents: [folderId]
  };
  var media = {
    mimeType: 'application/pdf',
    body: fs.createReadStream(target)
  };

  if (overwrite) {
    const existingFileId = fileIdIfExists()
    if (existingFileId) {
      update(existingFileId, fileMetadata, media)
    } else {
      create(fileMetadata, media)
    }
  } else {
    create(fileMetadata, media)
  }

}

main().catch(e => actions.setFailed(e));
