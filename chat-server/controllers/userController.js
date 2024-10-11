const FriendRequest = require("../models/friendRequest.js") ;
const User = require("../models/user.js");
const filterObj = require("../utils/filterObj.js");
const catchAsync = require("../utils/catchAsync");

// -------------------------- Verified Users List --------------------------
exports.getUsers = async (req, res, next) => {
  try {
    // getting all verified users from DB
    const all_users = await User.find({
      verified: true,
    }).select("firstName lastName _id avatar"); // only fetching required fields

    const this_user = req.user; // getting current user

    // users not in friend list
    const remaining_user = all_users.filter(
      (user) =>
        // users not in this_user friend list
        !this_user.friends.includes(user._id) &&
        // does not includes itself {User 1 will not be present in this list}
        user._id.toString() !== req.user._id.toString()
    );

    // Get the users to whom the current user has sent friend requests
    const sentFriendRequests = await FriendRequest.find({
      sender: this_user._id,
    }).populate("recipient", "firstName lastName _id avatar");

    res.status(200).json({
      status: "success",
      message: "Users Found!",
      data: {
        remaining_user,
        sentFriendRequests: sentFriendRequests.map(
          (request) => request.recipient
        ),
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Unable to get All Users: ${error}`,
    });
  }
};

// -------------------------- Getting User Friends --------------------------
exports.getFriends = async (req, res, next) => {
  try {
    const this_user = await User.findById(req.user._id).populate(
      "friends",
      "_id firstName lastName status avatar"
    ); // getting all friends from DB

    res.status(200).json({
      status: "success",
      message: "Friends List Found!",
      data: this_user.friends,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Unable to get Users Friends List: ${error}`,
    });
  }
};

// -------------------------- Getting All Friend Requests --------------------------
exports.getRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({
      recipient: req.user._id,
    }).populate("sender", "_id firstName lastName avatar");

    res.status(200).json({
      status: "success",
      message: "Friend Requests List Found!",
      data: requests,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Unable to get Friend Request: ${error}`,
    });
  }
};

// -------------------------- User Profile --------------------------
exports.updateProfile = async (req, res, next) => {
  try {
    const filteredBody = filterObj(
      req.body,
      "firstName",
      "lastName",
      "about",
      "avatar"
    );

    const updated_user = await User.create(filteredBody);

    res.status(200).json({
      status: "success",
      data: updated_user,
      message: "Profile Updated",
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Unable to Update Users Profile: ${error}`,
    });
  }
};

exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: req.user,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "about",
    "avatar"
  );

  const userDoc = await User.findByIdAndUpdate(req.user._id, filteredBody);

  res.status(200).json({
    status: "success",
    data: userDoc,
    message: "User Updated successfully",
  });
});
