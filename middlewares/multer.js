const multer = require('multer');

const multerUpload = multer({
    limits: {
        fileSize: 1024 * 1024 * 5
    },
});

const singleAvatar = multerUpload.single('avatar');
const attachmentsUpload = multerUpload.array('files', 5);

module.exports = { singleAvatar, attachmentsUpload };