const { createResource, updateResourceUrl, deleteResource, isScormExists } = require('../../dao/scorm/scormDao');
const { extractScormToS3, getLaunchFileFromFileList, deleteScormFromS3 } = require('../../utils/scorm');
const AWS = require('aws-sdk');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const prisma = require('../../config/prismaClient');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// -----------------------------
// Upload SCORM (module-based)
// -----------------------------
async function createResourceController(req, res) {
  try {
    const file = req.file;
    const { module_id, uploaded_by, description } = req.body;

    if (!file || !['application/zip', 'application/x-zip-compressed'].includes(file.mimetype))
      return errorResponse(req, res, 400, messages.INVALID_FILE);

    const exists = await isScormExists(module_id);
    if (exists) return errorResponse(req, res, 400, messages.SCORM_ALREADY_EXITS);

    // Create resource in DB
    const resource = await createResource({
      module_id,
      uploaded_by,
      description,
      file_size: file.size
    });

    // Upload SCORM to S3
    const fileList = await extractScormToS3(file, resource.id);

    // Get launch file (index.html)
    const launchKey = await getLaunchFileFromFileList(resource.id, fileList);

    // Construct full S3 URL (public or pre-signed)
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${launchKey}`;
    // For private buckets, you can use:
    // const s3Url = s3.getSignedUrl('getObject', { Bucket: process.env.S3_BUCKET_NAME, Key: launchKey, Expires: 3600 });

    // Store the S3 URL in DB
    await updateResourceUrl({ id: resource.id, url: s3Url });

    return successResponse(req, res, { id: resource.id, url: s3Url }, 201, messages.SCORM_UPDATED_SUCCESSFULLY);

  } catch (err) {
    console.error('SCORM upload error:', err);
    return errorResponse(req, res, 500, `Error uploading SCORM: ${err.message}`);
  }
}

// -----------------------------
// Delete SCORM by resource ID
// -----------------------------
async function deleteScorm(req, res) {
  try {
    const { id } = req.params;

    // Delete files from S3
    await deleteScormFromS3(id);

    // Delete DB record
    await deleteResource(id);

    return successResponse(req, res, {}, 200, messages.SCORM_DELETED_SUCCESSFULLY);
  } catch (err) {
    console.error('SCORM delete error:', err);
    return errorResponse(req, res, 500, messages.FAILED_TO_DELETE_SCORM);
  }
}

// -----------------------------
// Launch SCORM by module ID
// -----------------------------
async function launchScorm(req, res) {
  try {
    const { moduleId } = req.params;

    // Fetch the SCORM resource for this module
    const resource = await prisma.resource.findFirst({
      where: { module_id: moduleId },
    });

    if (!resource || !resource.url) {
      return res.status(404).json({ success: false, message: 'SCORM resource not found for this module' });
    }

    let s3Url = resource.url;

    // If DB has relative path, prepend bucket URL
    if (!s3Url.startsWith('http')) {
      s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${resource.url}`;
    }

    // For private buckets, optionally generate pre-signed URL:
    // s3Url = s3.getSignedUrl('getObject', { Bucket: process.env.S3_BUCKET_NAME, Key: resource.url, Expires: 3600 });

    return res.json({ success: true, url: s3Url });

  } catch (err) {
    console.error('launchScorm error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching SCORM URL' });
  }
}

module.exports = {
  createResourceController,
  deleteScorm,
  launchScorm,
};
