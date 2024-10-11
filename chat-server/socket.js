const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");
const { Server } = require("socket.io");

// Create an io server and allow for CORS from http://localhost:3000 with GET and POST methods
const initializeSocket = (server) => {
  // creating socket.io instence
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // listen to socket connection
  io.on("connection", async (socket) => {
    const user_id = socket.handshake.query["user_id"];

    console.log(`User connected to ${socket.id}`);

    if (user_id !== null && Boolean(user_id)) {
      try {
        User.findByIdAndUpdate(user_id, {
          socket_id: socket.id,
          status: "Online",
        });
      } catch (err) {
        console.log(err);
      }
    }

    // We can write our socket event listeners in here...
    socket.on("friend_request", async (data) => {
      // data => {to, from}

      const to = await User.findById(data.to).select("socket_id");
      const from = await User.findById(data.from).select("socket_id");

      // create a friend request

      await FriendRequest.create({
        sender: data.from,
        recipient: data.to,
      });

      // emit event => "new_friend_request"
      io.to(to?.socket_id).emit("new_friend_request", {
        message: "New friend request received",
      });

      // emit event => "request_sent"
      io.to(from?.socket_id).emit("request_sent", {
        message: "Request sent successfully!",
      });

      console.log(`Request sent from ${from} to ${to}`);
    });

    // cancel request listener
    socket.on("cancel_request", async (data) => {
      try {
        // Check if the request exists
        const requestExists = await FriendRequest.findOne({
          sender: data.from,
          recipient: data.to,
        });

        if (!requestExists) {
          // Handle the case where the request doesn't exist
          io.to(socket.id).emit("event_error", {
            message: "Friend request not found",
          });
          return;
        }

        // Delete the friend request
        await FriendRequest.findOneAndDelete({
          sender: data.from,
          recipient: data.to,
        });

        // Emit a confirmation event to the user who canceled the request
        io.to(socket.id).emit("request_canceled", {
          message: "Friend request canceled successfully",
        });

      } catch (error) {
        console.error("Error canceling friend request:", error);
        // Handle any errors that may occur during the process
        io.to(socket.id).emit("event_error", {
          message: "An error occurred while canceling the friend request",
        });
      }
    });

    // accept request listener
    socket.on("accept_request", async (data) => {
      const request_doc = await FriendRequest.findById(data.request_id);

      console.log("Accepted request");
      console.log(request_doc);

      // request_id
      const sender = await User.findById(request_doc.sender);
      const receiver = await User.findById(request_doc.recipient);

      sender.friends.push(request_doc.recipient);
      receiver.friends.push(request_doc.sender);

      await receiver.save({ new: true, validateModifiedOnly: true });
      await sender.save({ new: true, validateModifiedOnly: true });

      await FriendRequest.findByIdAndDelete(data.request_id);

      io.to(sender?.socket_id).emit("request_accepted", {
        message: "Friend Request Accepted",
      });

      io.to(receiver?.socket_id).emit("request_accepted", {
        message: "Friend Request Accepted",
      });
    });

    socket.on("get_direct_conversations", async ({ user_id }, callback) => {
      const existing_conversations = await OneToOneMessage.find({
        participants: { $all: [user_id] },
      }).populate("participants", "firstName lastName avatar _id email status");

      console.log(existing_conversations);

      callback(existing_conversations);
    });

    socket.on("start_conversation", async (data) => {
      // data: {to, from}
      const { to, from } = data;

      console.log(data);

      // check if there is any existing conversation between these users
      const existing_conversations = await OneToOneMessage.find({
        participants: { $size: 2, $all: [to, from] },
      }).populate("participants", "firstName lastName _id email status");

      console.log(existing_conversations[0], "Existing Conversation");

      // if no existing_conversation
      if (existing_conversations.length === 0) {
        let new_chat = await OneToOneMessage.create({
          participants: [to, from],
        });

        new_chat = await OneToOneMessage.findById(new_chat._id).populate(
          "participants",
          "firstName lastName _id email status"
        );

        console.log(new_chat);

        socket.emit("start_chat", new_chat);
      }

      // if there is existing_conversation
      else {
        socket.emit("start_chat", existing_conversations[0]);
      }
    });

    // reject request listener
    socket.on("reject_request", async (data) => {
      const request_doc = await FriendRequest.findById(data.request_id);

      const receiver = await User.findById(request_doc.recipient);

      // deleting friend request event after it is rejected
      await FriendRequest.findByIdAndDelete(data.request_id);

      // emitting message to the recipient that the request was rejected
      io.to(receiver.socket_id).emit("request_rejected", {
        message: "Friend Request Rejected",
      });
    });

    // remove friend listener
    socket.on("remove_friend", async (data) => {
      try {
        const user = await User.findById(data.user_id);

        // Check if the user exists
        if (!user) {
          // Handle the case where the user doesn't exist
          io.to(socket.id).emit("event_error", {
            message: "User not found",
          });
          return;
        }

        const friendToRemove = await User.findById(data.friend_id);

        // Check if the friend to remove exists
        if (!friendToRemove) {
          // Handle the case where the friend doesn't exist
          io.to(user.socket_id).emit("event_error", {
            message: "Friend not found",
          });
          return;
        }

        // Remove the friend from the user's friend list
        user.friends.pull(data.friend_id);
        await user.save();

        // Remove the user from the friend's friend list
        friendToRemove.friends.pull(data.user_id);
        await friendToRemove.save();

        // Emit a confirmation event to the user who initiated the removal
        io.to(user.socket_id).emit("friend_removed", {
          message: "Friend removed successfully",
        });
      } catch (error) {
        console.error("Error removing friend:", error);
        // Handle any errors that may occur during the process
        io.to(socket.id).emit("event_error", {
          message: "An error occurred while removing the friend",
        });
      }
    });

    // -------------- HANDLE SOCKET DISCONNECTION ----------------- //
    socket.on("end", async (data) => {
      // Find user by _id and set the status to Offline
      if (data.user_id) {
        await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
      }

      // // broadcast to all conversation rooms of this user that this user is offline (disconnected)
      console.log("Closing connection");
      socket.disconnect(0);
    });
  });
};

module.exports = initializeSocket;
