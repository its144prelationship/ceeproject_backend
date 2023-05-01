const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const AppError = require("./utils/appError");
const routes = require("./routes");

const app = express();

const sessionOptions = {
  secret: "my-secret",
  resave: true,
  saveUninitialized: true,
  cookie: {
    // setting this false for http connections
    secure: false,
  },
};

const corsOptions = {
  origin: true,
  credentials: true,
};

app.use(express.static("static"));
app.use(cors(corsOptions));
app.use(session(sessionOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", routes);
// app.get("/", (req, res) => {
//   res.send("Congratulation. This server is successfully run.");
// });

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

module.exports = app;
