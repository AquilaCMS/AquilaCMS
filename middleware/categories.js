const serviceAuth = require('../services/auth');

const filterCategories = (req, res, next) => {
    const {PostBody} = req.body;
    const {authorization} = req.headers;
    if (!serviceAuth.isAdmin(authorization)) {
        const date = new Date();
        PostBody.filter.$and = [
            {openDate: {$lte: date}},
            {$or: [{closeDate: {$gte: date}}, {closeDate: {$eq: undefined}}]}
        ];
    }
    next();
};

module.exports = {
    filterCategories
};