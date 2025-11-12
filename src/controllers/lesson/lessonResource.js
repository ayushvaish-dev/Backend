const { uploadToS3, deleteFromS3, replaceInS3 } = require("../../utils/lessonResource");
const {resourceUpload} = require("../../middleware/multerAws");

// Upload resource
const uploadLessonResource = async (req, res) => {
  resourceUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    try {
      const url = await uploadToS3(req.file);
      res.json({ success: true, url });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
};

// Delete resource
const deleteLessonResource = async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "fileUrl is required" });
    }

    await deleteFromS3(fileUrl);
    res.json({ success: true, message: "Resource deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLessonResource = async (req, res) => {
  resourceUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: "No new file uploaded" });

    try {
      const { oldFileUrl } = req.body;
      if (!oldFileUrl) {
        return res.status(400).json({ success: false, message: "oldFileUrl is required" });
      }

      const updatedUrl = await replaceInS3(req.file, oldFileUrl);

      res.json({ success: true, url: updatedUrl });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
};

module.exports = { uploadLessonResource, deleteLessonResource, updateLessonResource };