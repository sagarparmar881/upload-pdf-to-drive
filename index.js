const actions = require('@actions/core');
const { google } = require('googleapis');
const fs = require('fs');
const getfilelist = require('google-drive-getfilelist');

/** Google Service Account credentials  encoded in base64 */
const credentials = actions.getInput('credentials', { required: true });
/** Google Drive Folder ID to upload the file/folder to */
const folderId = actions.getInput('folderId', { required: true });
/** Local path to the file/folder to upload */
const target = actions.getInput('target', { required: true });
/** Optional name for the pdf file */
// const filename = actions.getInput('filename', { required: false });
const filename = 'Untitled.pdf'
/** Optional should overwrite or not */
const overwrite = actions.getInput('overwrite', { required: false });
/** Link to the Drive folder */
const link = 'link';

const credentialsJSON = JSON.parse(Buffer.from(credentials, 'base64').toString());
const scopes = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.JWT(credentialsJSON.client_email, null, credentialsJSON.private_key, scopes);
const drive = google.drive({ version: 'v3', auth });


async function main() {
  uploadToDrive();
}

function getFileName() {
  return 'Untitled.pdf'
}

function doList(pageToken) {
  return new Promise((resolve, reject) => {
    drive.files.list({
      q: "mimeType='application/pdf'",
      fields: 'nextPageToken, files(id,name,parents,webViewLink)',
      spaces: 'drive',
      pageToken: pageToken
    }, function (err, res) {
      if (err) {
        reject(err)
      } else {
        const searchedFile = res.data.files.find(file => file.parents[0] === folderId && file.name === `${filename}.pdf`);
        const nextPageToken = res.nextPageToken;
        resolve({ searchedFile, nextPageToken });
      }
    });
  })
}

async function fileIdIfExists() {
  let currentPageToken = null
  let result = undefined
  do {
    await doList(currentPageToken).then(({ searchedFile, nextPageToken }) => {
      currentPageToken = nextPageToken
      result = searchedFile
    }).catch(err => {
      console.error(`Failure occurred while searching for file: ${err}`);
    })
  } while (!!currentPageToken && !result);
  actions.setOutput(link, result.webViewLink);
  return result ? result.id : null
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
    media: media,
    addParents: [folderId]
  }).then(() => actions.info('File uploaded successfully'))
    .catch(e => {
      actions.error('Upload failed');
      throw e;
    });
}

/**
 * Uploads the file to Google Drive
 */
async function uploadToDrive() {
  const fileMetadata = {
    name: getFileName(),
  };
  const createFileMetadata = {
    ...{ fileMetadata },
    parents: [folderId]
  };
  var media = {
    mimeType: 'application/pdf',
    body: fs.createReadStream(target)
  };
  if (overwrite === 'true') {
    actions.info('Checking if file exists...');
    const existingFileId = await fileIdIfExists()
    if (existingFileId) {
      actions.info(`File exists with ID: ${existingFileId}`);
      actions.info("Updating file..")
      update(existingFileId, fileMetadata, media)
    } else {
      actions.info("Creating new file..")
      create(createFileMetadata, media)
    }
  } else {
    actions.info("Creating new file..")
    create(createFileMetadata, media)
  }
}

main().catch(e => actions.setFailed(e));
