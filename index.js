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

function doList(pageToken) {
  return new Promise((resolve, reject) => {
    drive.files.list({
      q: "mimeType='application/pdf'",
      fields: 'nextPageToken, files(id,name,parents)',
      spaces: 'drive',
      pageToken: pageToken
    }, function (err, res) {
      if (err) {
        // Handle error
        console.error(err);
        reject(err)
      } else {
        const searchedFile = res.data.files.find(file => file.parents[0] === folderId && file.name === `${filename}.pdf`);
        pageToken = res.nextPageToken;
        resolve({ searchedFile, pageToken });
      }
    });
  })
}

async function fileIdIfExists() {
  let currentPageToken = null
  let result = []
  do {
    await doList(currentPageToken).then(({ searchedFile, pageToken }) => {
      currentPageToken = pageToken
      result = searchedFile
    })
  } while (!!currentPageToken || result.length === 0);
  return result.length > 0 ? result[0].id : null
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
async function uploadToDrive() {
  var fileMetadata = {
    name: getFileName(),
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
      create(fileMetadata, media)
    }
  } else {
    actions.info("Creating new file..")
    create(fileMetadata, media)
  }
}

main().catch(e => actions.setFailed(e));
