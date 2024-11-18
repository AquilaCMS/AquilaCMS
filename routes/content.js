const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 
app.post('/api/upload', upload.single('image'), (req, res) => {
    res.status(200).json({ message: 'Image uploaded successfully', filename: req.file.filename });
});
