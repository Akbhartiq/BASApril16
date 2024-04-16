const express = require("express");
const signinrouter = express.Router();

signinrouter.get("/", (req, res) => {
     return res.render("signin");
});

module.exports = signinrouter; // Export the router directly