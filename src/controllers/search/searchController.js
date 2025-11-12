const searchDao = require('../../dao/search/searchDao');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
exports.searchAll = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return errorResponse(req, res, 400, messages.MISSING_QUERY);
  }

  try {
    const results = await searchDao.searchEntities(q);
    return res.json({ query: q, results });
  } catch (err) {
    console.error('Search error:', err);
    return errorResponse(req, res, 500, messages.SEARCH_FAILED);
  }
};



