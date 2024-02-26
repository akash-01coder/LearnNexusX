const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");

// auth
exports.auth = async(req,res,next) => {
    try{
        // extract jwt token
        // other ways to fetch token
        const token = req.body.token || req.cookies.token || req.header("Authorization").replace("Bearer ","") ;
        if(!token){
            return res.status(401).json({
                success : false,
                message:"token missing"
            });
        }
        // verify the token
        try{
            const decode = jwt.verify(token,process.env.JWT_SECRET);
            console.log(decode);
            req.user = decode;
        }
        catch(error){
            return res.status(401).json({
                success : false,
                message:"token is invalid"
            });
        }
        next();
    }
    catch(error){
        return res.status(401).json({
            success : false,
            message:"Something went wrong, while verifying the token"
        });
    }
}


// isStudent
exports.isStudent = async(req,res,next) => {
    try{
        if(req.user.accountType!=="Student"){
            return res.status(401).json({
                success : false,
                message:"This is a protected route for students only"
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success : false,
            message:"User role is not matching"
        });
    }
}

// isInstructor
exports.isInstructor = async(req,res,next) => {
    try{
        if(req.user.accountType!=="Instructor"){
            return res.status(401).json({
                success : false,
                message:"This is a protected route for instructor"
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success : false,
            message:"User role is not matching"
        });
    }
}

// isAdmin
exports.isAdmin = async (req,res,next) => {
    try{
        if(req.user.accountType!=="Admin"){
            return res.status(401).json({
                success : false,
                message:"This is a protected route for admin"
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success : false,
            message:"User role is not matching"
        });
    }
}

