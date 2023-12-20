const autoFillCode = (req, res, next) => {
    const entity = req.body;
    try {
        if (!entity.code) {
            entity.code = (new Date()).getTime().toString();
        }
    } catch (err) {
        console.error('AutoFillCode rise an error: ', err.message);
    }
    next();
};

module.exports = {
    autoFillCode
};