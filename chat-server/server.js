const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down...");
  process.exit(1); // Exit Code 1 indicates that a container shut down, either because of an application failure.
});

const http = require("http");
const server = http.createServer(app);

const initializeSocket = require("./socket");

const DB = process.env.DBURI.replace("<PASSWORD>", process.env.DBPASSWORD);

mongoose
  .connect(DB)
  .then((con) => {
    console.log("DB connection is successfully");
  })
  .catch((err) => {
    console.log(err);
  });

const port = process.env.PORT || 3500;

// Initialize Socket.io
initializeSocket(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Listen for when the client connects via socket.io-client
// io.on("connection", async (socket) => {

//   const user_id = socket.handshake.query["user_id"];

//   console.log(`User connected to ${socket.id}`);

//   if (user_id !== null && Boolean(user_id)) {
//     try {
//       User.findByIdAndUpdate(user_id, {
//         socket_id: socket.id,
//         status: "Online",
//       });
//     } catch (err) {
//       console.log(err);
//     }
//   }

//   // We can write our socket event listeners in here...
//   socket.on("friend_request", async (data) => {

//     // data => {to, from}

//     const to = await User.findById(data.to).select("socket_id");
//     const from = await User.findById(data.from).select("socket_id");

//     // create a friend request

//     await FriendRequest.create({
//       sender: data.from,
//       recipient: data.to,
//     });

//     // emit event => "new_friend_request"
//     io.to(to?.socket_id).emit("new_friend_request", {
//       message: "New friend request received",
//     });

//     // emit event => "request_sent"
//     io.to(from?.socket_id).emit("request_sent", {
//       message: "Request sent successfully!",
//     });

//     console.log(`Request sent from ${from} to ${to}`);
//   });

//   socket.on("accept_request", async (data) => {

//     const request_doc = await FriendRequest.findById(data.request_id);

//     console.log("Accepted request")
//     console.log(request_doc);

//     // request_id
//     const sender = await User.findById(request_doc.sender);
//     const receiver = await User.findById(request_doc.recipient);

//     sender.friends.push(request_doc.recipient);
//     receiver.friends.push(request_doc.sender);

//     await receiver.save({ new: true, validateModifiedOnly: true });
//     await sender.save({ new: true, validateModifiedOnly: true });

//     await FriendRequest.findByIdAndDelete(data.request_id);

//     io.to(sender?.socket_id).emit("request_accepted", {
//       message: "Friend Request Accepted",
//     });

//     io.to(receiver?.socket_id).emit("request_accepted", {
//       message: "Friend Request Accepted",
//     });
//   });

//   socket.on("get_direct_conversations", async ({ user_id }, callback) => {
//     const existing_conversations = await OneToOneMessage.find({
//       participants: { $all: [user_id] },
//     }).populate("participants", "firstName lastName avatar _id email status");

//     console.log(existing_conversations);

//     callback(existing_conversations);
//   });

//   socket.on("start_conversation", async (data) => {
//     // data: {to, from}
//     const { to, from } = data;

//     console.log(data);

//     // check if there is any existing conversation between these users
//     const existing_conversations = await OneToOneMessage.find({
//       participants: { $size: 2, $all: [to, from] },
//     }).populate("participants", "firstName lastName _id email status");

//     console.log(existing_conversations[0], "Existing Conversation");

//     // if no existing_conversation
//     if (existing_conversations.length === 0) {
//       let new_chat = await OneToOneMessage.create({
//         participants: [to, from],
//       });

//       new_chat = await OneToOneMessage.findById(new_chat._id).populate(
//         "participants",
//         "firstName lastName _id email status"
//       );

//       console.log(new_chat);

//       socket.emit("start_chat", new_chat);
//     }

//     // if there is existing_conversation
//     else {
//       socket.emit("start_chat", existing_conversations[0]);
//     }
//   });

//   // socket.on("get_messages", async (data, callback) => {
//   //   try {
//   //     const { messages } = await OneToOneMessage.findById(
//   //       data.conversation_id
//   //     ).select("messages");
//   //     callback(messages);
//   //   } catch (err) {
//   //     console.log(err);
//   //   }
//   // });

//   // Handle text/link messages
//   socket.on("text_message", async (data) => {
//     console.log("Received message: ", data);

//     // data: {to, from, text, conversation_id, type}
//     const { to, from, message, conversation_id, type } = data;

//     const to_user = await User.findById(to);
//     const from_user = await User.findById(from);

//     const new_message = {
//       to: to,
//       from: from,
//       type: type,
//       create_at: Date.now(),
//       text: message,
//     };

//     console.log(conversation_id);

//     // create a new conversation if it doesn't exist yr or add new message to the message list
//     const chat = await OneToOneMessage.findById(conversation_id);
//     console.log(chat);
//     chat.messages.push(new_message);

//     // save to db
//     await chat.save({ new: true, validateModifiedOnly: true });

//     // emit new_message -> to user
//     io.to(to_user?.socket_id).emit("new_message", {
//       conversation_id,
//       message: new_message,
//     });

//     // emit new_message -> from user
//     io.to(from_user?.socket_id).emit("new_message", {
//       conversation_id,
//       message: new_message,
//     });
//   });

//   // handle Media/Document Message
//   socket.on("file_message", async (data) => {
//     console.log("Received Message: ", data);

//     // data: {to, from, text}

//     // get file extension
//     const fileExtension = path.extname(data.file.name);

//     // generate a unique filename
//     const fileName = `${Date.now()}_${Math.floor(
//       Math.random() * 10000
//     )}${fileExtension}`;

//     // upload file to AWS s3

//     // create a new conversation if its dosent exists yet or add a new message to existing conversation

//     // save to db

//     // emit incoming_message -> to user

//     // emit outgoing_message -> from user
//   });

//   // -------------- HANDLE SOCKET DISCONNECTION ----------------- //
//   socket.on("end", async (data) => {
//     // Find user by _id and set the status to Offline
//     if (data.user_id) {
//       await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
//     }

//     // // broadcast to all conversation rooms of this user that this user is offline (disconnected)
//     console.log("Closing connection");
//     socket.disconnect(0);
//   });
// });

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
