const express = require("express"); // Web framework for for Node.js

const morgan = require("morgan"); // HTTP request logger middleware for Node.js

const rateLimit = require("express-rate-limit");

const helmet = require("helmet");

const mongoSanitize = require("express-mongo-sanitize");

const bodyParser = require("body-parser");

const cookieParser = require("cookie-parser"); // Parse Cookie header and populate req.cookies with an object keyed by the cookie names.

const xss = require("xss-clean");

const cors = require("cors");

const app = express();

const routes = require("./routes/index");

const session = require("cookie-session"); // Simple cookie-based session middleware.

//

app.use(
  cors({
    origin: "*",
    methods: ["GET", "PATCH", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.json({ limit: "10kb" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "keyboard cat",
    proxy: true,
    resave: true,
    saveUnintialized: true,
    cookie: {
      secure: false,
    },
  })
);

app.use(helmet());

if (process.env.NODE_END === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 3000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, Please try again in an hours",
});

app.use("/chat", limiter);

app.use(express.urlencoded({ extended: true }));

app.use(mongoSanitize());

app.use(xss());

app.use(routes);

module.exports = app;
