const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");

const mailService = require("../services/mailer");

//
const User = require("../models/user");
const filterObj = require("../utils/filterObj");
const { promisify } = require("util");
const otp = require("../templates/mail/otp");
const resetPassword = require("../templates/mail/resetPassword");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

// Signup => register - sendOTP - verifyOTP

// http://api.chat.com/auth/register

// Register new user
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password"
  );

  // Check if a verified user with given email exists

  const existing_user = await User.findOne({ email: email });

  if (existing_user && existing_user.verified) {
    res.status(400).json({
      status: "error",
      message: "Email is already in use. Please login",
    });
  } else if (existing_user) {
    await User.findOneAndUpdate({ email: email }, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });

    // generate OTP and send email to User
    req.userId = existing_user._id;
    next();
  } else {
    // if user record is not available in DB
    const new_user = await User.create(filteredBody);

    // generate OTP and send email to User
    req.userId = new_user._id;
    next();
  }
};

// Send OTP
exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 mins after otp is sent

  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log(new_otp);

  // Send Mail
  const email = user.email;
  const subject = "Verification OTP";
  const html = otp(user.firstName, new_otp);

  mailService.sendEmail({ email, subject, html });

  res.status(200).json({
    status: "success",
    message: "OTP Sent Successfully!",
  });
};

// Verify OTP
exports.verifyOTP = async (req, res, next) => {
  //Verify OTP and update user record accordingly

  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });

    return;
  }

  // OTP is correct
  user.verified = true;
  user.otp = undefined;

  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified successfully!",
    token,
    user_id: user._id,
  });
};

// Login user
exports.login = async (req, res, next) => {
  //
  const { email, password } = req.body;

  // console.log(email, password);

  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
    return;
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message: "Incorrect password",
    });

    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully!",
    token,
    user_id: user._id,
  });
};

// Protect
exports.protect = async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      message: "You are not logged in! Please log in to get access.",
    });
  }
  // 2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // console.log(decoded);

  // 3) Check if user still exists

  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    return res.status(401).json({
      message: "The user belonging to this token does no longer exists.",
    });
  }
  // 4) Check if user changed password after the token was issued
  if (this_user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      message: "User recently changed password! Please log in again.",
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = this_user;
  next();
};

// Types of routes -> Protected (Only logged in user can access these) & Unprotected

// forgot password
exports.forgotPassword = async (req, res, next) => {
  // 1, Get users email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with given email address",
    });
  }

  // Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `http://localhost:3000/auth/new-password/?token=${resetToken}`;
    // Send email with reset URL
    console.log(resetURL);

    const email = user.email;
    const subject = "Reset Password";
    const html = resetPassword(user.firstName, resetURL);

    mailService.sendEmail({ email, subject, html });

    res.status(200).json({
      status: "success",
      message: "Reset Password link sent to Email",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      status: "error",
      message: "There was an error sending the email. Please try again later.",
    });
  }
};

// reset password
exports.resetPassword = async (req, res, next) => {
  // 1, Get user based on token

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2, If token has expired or submission is out of time Window

  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Token is Invalid or Expired",
    });
  }

  // 3, Update users password and set resetToken & expiry to undefined

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 4, Log in the user and Send new JWT

  // Send email to user informing about password reset

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password Reset Successfully!",
    token,
  });
};
