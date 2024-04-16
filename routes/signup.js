const express = require("express");
const signuprouter = express.Router();

signuprouter.get("/", (req, res) => {
     return res.render("signup");
});

module.exports = signuprouter; // Export the router directly