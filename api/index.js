const express = require("express");
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");
const user = require("./models/user");
const Post = require("./models/Post");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadmiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
const app = express();

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

const salt = bcrypt.genSaltSync(10);
const secret = "dfhahfdah49843fsdfsafa";
mongoose.connect(
  "mongodb+srv://blog:5GkXSSm2cK8pgnjO@cluster0.ufjlwuh.mongodb.net/"
);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await user.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(400).json(e);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const userDoc = await user.findOne({ username });
  const passok = bcrypt.compareSync(password, userDoc.password);
  if (passok) {
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("wrong credentials");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadmiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newpath = path + "." + ext;
  fs.renameSync(path, newpath);
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      content,
      summary,
      cover: newpath,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.put("/post", uploadmiddleware.single("file"), async (req, res) => {
  let newpath=null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
     newpath = path + "." + ext;
    fs.renameSync(path, newpath);
  }     

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content,id } = req.body;
    const postDoc=await Post.findById(id);
    const isAuthor=JSON.stringify(postDoc.author)===JSON.stringify(info.id);
    if(!isAuthor){
     return res.status(400).json('you are not the author');
      }
     await Post.updateOne(
      {_id:id},{
      title,
      summary,
      content,
      cover:newpath?newpath:postDoc.cover,

     });
     res.json(postDoc);
  });
});



app.listen(4000, () => {
  console.log("server is running");
});

//5GkXSSm2cK8pgnjO
//mongodb+srv://blog:5GkXSSm2cK8pgnjO@cluster0.ufjlwuh.mongodb.net/
