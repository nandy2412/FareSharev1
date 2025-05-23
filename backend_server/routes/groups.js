//groups.js routes

const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const gc = require('../controllers/groupController');

router.post('/', auth, gc.createGroup);
router.get('/', auth, gc.listGroupsWithNotifications);
router.get('/:groupID',  gc.getGroupById);
router.put('/:groupID', auth, gc.updateGroup);
router.post('/:groupID/addUser', auth, gc.addUserToGroup);
router.post('/:groupID/removeUser', auth, gc.removeUserFromGroup);
module.exports = router;
