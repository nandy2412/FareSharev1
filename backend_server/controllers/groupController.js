//groupController.js

const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');

//Creating a new group and adding the creator as the first member of the group
exports.createGroup = async (req, res) => {
  try {
    const { groupName, groupColor, userUid } = req.body;  

    const user = await User.findOne({ firebaseUID: userUid });
    if (!user) throw new Error(`User with UID ${userUid} not found`);

    const group = await Group.create({
      groupName,
      groupColor,
      users: [user._id], 
    });

    res.status(201).json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

//Retrieving all the groups that the logged in user belongs to
exports.getGroups = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const user = await User.findOne({ firebaseUID: userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const groups = await Group.find({ users: user._id }).populate('users');
    if (groups.length === 0) return res.status(404).json({ message: 'No groups found for this user' });
    
    //Only important group fields are mapped
    const formattedGroups = groups.map(group => ({
      groupID: group._id,
      groupName: group.groupName,
      groupColor: group.groupColor,
    }));

    res.json(formattedGroups);
  } catch (err) {
    next(err);
  }
};

//Retrieving single group based on the GroupID in MongoDB
exports.getGroupById = async (req, res, next) => {
  try {

    const { groupID } = req.params;
    const group = await Group.findById(groupID).populate('users');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    res.json(group);
  } catch (err) {
    next(err);
  }
};

//Updating the group details based on the user's inputs
exports.updateGroup = async (req, res, next) => {
  try {
    const { groupID } = req.params;
    const { groupName, groupColor } = req.body;

    const group = await Group.findById(groupID).populate('users');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.groupName = groupName || group.groupName;
    group.groupColor = groupColor || group.groupColor;

    const updatedGroup = await group.save(); 

    res.json(updatedGroup); 
  } catch (err) {
    next(err);
  }
};

//Adding members to a group based on their email addresses
exports.addUserToGroup = async (req, res, next) => {
  try {
    const { groupID } = req.params;
    const { email } = req.body;

    const group = await Group.findById(groupID);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    //Adding only if the user is not present in the group already
    const updatedGroup = await Group.findByIdAndUpdate(
      groupID,
      { $addToSet: { users: user._id } },
      { new: true }
    ).populate('users');

    res.json(updatedGroup);
  } catch (err) {
    next(err);
  }
};

//Users can exit the group at any time  
exports.removeUserFromGroup = async (req, res, next) => {
  try {
    const { groupID } = req.params;
    const { userId } = req.body;

    const group = await Group.findById(groupID);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const user = await User.findOne({ firebaseUID: userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updatedGroup = await Group.findByIdAndUpdate(
      groupID,
      { $pull: { users: user._id } },
      { new: true }
    ).populate('users');

    res.json(updatedGroup);
  } catch (err) {
    next(err);
  }
};

//Displaying the logged in user's groups with a flag to show if the members in the group have created/hosted any ride
exports.listGroupsWithNotifications = async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUID: req.user.uid });
    if (!me) return res.status(404).json({ message: 'User not found' });

    const groups = await Group.find({ users: me._id }).lean();

    const notifs = await Notification.find({
      userID: me._id,
      read:   false
    }).select('groupID').lean();

    const hasNew = new Set(notifs.map(n => String(n.groupID)));

    const out = groups.map(g => ({
      ...g,
      hasNewRide: hasNew.has(String(g._id))
    }));

    res.json(out);
  } catch (err) {
    next(err);
  }
};