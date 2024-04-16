const express =require("express");
const homerouter =express.Router();
homerouter.get("/",(req,res)=>
{
     return res.render("home");
});
module.exports={
    homerouter ,
}