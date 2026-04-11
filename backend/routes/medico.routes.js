const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
    res.json({ message: '✅ medico.routes.js funcionando' });
});

module.exports = router;