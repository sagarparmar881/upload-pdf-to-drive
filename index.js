const actions = require('@actions/core');
const { google } = require('googleapis');
const fs = require('fs');

/** Google Service Account credentials  encoded in base64 */
const credentials = actions.getInput('credentials', { required: true });
/** Google Drive Folder ID to upload the file/folder to */
const folder = actions.getInput('folder', { required: true });
/** Local path to the file/folder to upload */
const target = actions.getInput('target', { required: true });
/** Optional name for the zipped file */
const name = actions.getInput('name', { required: false });
/** Link to the Drive folder */
const link = 'link';

const credentialsJSON = JSON.parse(Buffer.from(credentials, 'base64').toString());
const scopes = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.JWT(credentialsJSON.client_email, null, credentialsJSON.private_key, scopes);
const drive = google.drive({ version: 'v3', auth });

const driveLink = `https://drive.google.com/drive/folders/${folder}`

async function main() {
  actions.setOutput(link, driveLink);
  uploadToDrive();
}

/**
 * Uploads the file to Google Drive
 */
function uploadToDrive() {
  actions.info('Uploading file to Goole Drive...');
  var fileMetadata = {
    'name': name.length > 0 ? `${name}.pdf` : 'cv.pdf',
    parents: [folder]
  };
  var media = {
    mimeType: 'application/pdf',
    body: fs.createReadStream(target)
  };
  drive.files.create({
    requestBody: fileMetadata,
    media: media
  }).then(() => actions.info('File uploaded successfully'))
    .catch(e => {
      actions.error('Upload failed');
      throw e;
    });
}

main().catch(e => actions.setFailed(e));
