const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require("crypto");


// resetPasswordToken
exports.resetPasswordToken = async(req,res) => {
    
    try{
        // get email from request ki body
        const email = req.body.email;

        // email validation and check user exist or not
        const user = await User.findOne({email:email});
        if(!user){
            return res.status(400).json({
                success:false,
                message:`This Email: ${email} is not Registered With Us Enter a Valid Email `
            })
        }

        // generate token
        const token = crypto.randomBytes(20).toString("hex");
        // update user by adding token and expiration time
        const updateDetails = await User.findOneAndUpdate({email:email},{token:token,resetPasswordExpires:Date.now() + 3600000},{new:true});
        console.log("DETAILS", updateDetails);
        // create url
        const url = `http://localhost:3000/update-password/${token}`;

        // send mail containing url
        await mailSender(email,"Password Reset",
        `Your Link for email verification is ${url}. Please click this url to reset your password.`);

        // send response
        return res.status(200).json({
            success:true,
            message:"Email sent successfully. Please check email and change password"
        });

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Something went wrong, while sending reset password mail",
            error:error.message
        })
    }

}


// resetPassword
exports.resetPassword = async(req,res) => {
    try{
        // data fetch
        const {password,confirmPassword,token} = req.body;

        // validation
        if(confirmPassword!==password){
            return res.status(400).json({
                success:false,
                message:"Password not matching"
            })
        }
        console.log(token);
        // get userdetails from db using token
        const userDetails = await User.findOne({ token : token });
        console.log(userDetails);
        // if no entry, invalid token
        if(!userDetails){
            return res.status(400).json({
                success:false,
                message:"Token is invalid"
            })
        }
        // token time
        if(!(userDetails.resetPasswordExpires>Date.now())){
            return res.status(403).json({
                success:false,
                message:"Token is expired, please regenarate your token"
            })
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password,10);

        // password update 
        await User.findOneAndUpdate({token:token},{password:hashedPassword},{new:true});

        // return response
        return res.status(200).json({
            success:true,
            message:"Password reset successfully"
        })

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Something went wrong, while password reset",
            error:error.message
        })
    }
}

