const User = require("../models/User");
const Otp = require("../models/Otp");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
require("dotenv").config();


// sendOtp
exports.sendOtp = async(req,res) => {
    
    try{
        // fetch email from request ki body
        const {email} = req.body;

        // check if user already exist
        const checkUserPresent = await User.findOne({email});
        if(checkUserPresent){
            // Return 401 Unauthorized status code with error message
            return res.status(401).json({
                success:false,
                message:"User already registered"
            })
        }

        // if not 
        var otp = otpGenerator.generate(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false
        });
        console.log("OTP Generated : ",otp);

        // check otp is unique or not
        const result = await Otp.findOne({otp:otp});
		console.log("Result is Generate OTP Func");
		console.log("OTP", otp);
		console.log("Result", result);
		while (result) {
			otp = otpGenerator.generate(6, {
				upperCaseAlphabets: false,
			});
		}
        const otpPayload = {email,otp};

        // create an entry for otp in db
        const otpBody = await Otp.create(otpPayload);
        console.log("OTP Body",otpBody);

        // return response successful
        return res.status(200).json({
            success:true,
            message:"OTP sent successfully",
            otp
        })
    }
    catch(error){
        console.log(error.message);
        return res.status(500).json({
            success:false,
            error:error.message
        })
    }
}


// signup
exports.signUp = async(req,res) => {

    try{
        // data fetch from requset ki body
        const {firstName,lastName,email,password,confirmPassword,accountType,contactNumber,otp} = req.body;

        // validate krlo
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(403).json({
                success:false,
                message:"All fields are required"
            })
        }

        // password match krlo
        if(password!==confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Password and Confirm password value does not match. Please try again!"
            })
        }

        // check user already exist or not
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({
                success:false,
                message:"User already registered. Please, sign in to continue"
            })
        }

        // find most recent otp stored for the user and match with request otp
        const recentOtp = await Otp.find({ email }).sort({ createdAt : -1}).limit(1);
        console.log(recentOtp);
        if(recentOtp.length===0){
            // otp not found
            return res.status(400).json({
                success:false,
                message:"OTP not found"
            })
        }
        else if(otp!==recentOtp[0].otp){
            // invalid otp
            return res.status(400).json({
                success:false,
                message:"Invalid OTP"
            })
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password,10);

        // create the user
        let approved = "";
		approved === "Instructor" ? (approved = false) : (approved = true);

        // create entry in DB
        const profileDetails = await Profile.create({
            gender:null,
            dob:null,
            contactNumber:null,
            about:null
        })

        const user = await User.create({
            firstName,lastName,email,contactNumber,password:hashedPassword,accountType:accountType,
            approved:approved,
            additionalDetails:profileDetails._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        })

        // return res successfully
        return res.status(200).json({
            success:true,
            user,
            message:"User registered successfully"
        })

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"User cannot be registered. Please try again!"
        })
    }

}


// login
exports.login = async(req,res) => {

    try{
        // data fetch from request ki body
        const {email,password} = req.body;

        // data validation
        if(!email || !password){
            // Return 400 Bad Request status code with error message
            return res.status(400).json({
                success:false,
                message:`Please Fill up All the Required Fields`
            })
        }

        // email check
        const user = await User.findOne({email}).populate("additionalDetails");
        if(!user){
            // Return 401 Unauthorized status code with error message
            return res.status(401).json({
                success:false,
                message:"User is not registered. Please signup first"
            })
        }

        // Generate JWT token and Compare Password
        if(await bcrypt.compare(password,user.password)){
            const payload = {
                email : user.email,
                id: user._id,
                accountType : user.accountType
            }
            // jwt generation
            const token = jwt.sign(payload,process.env.JWT_SECRET,{
                expiresIn:"24h"
            });
            // Save token to user document in database
            user.token = token,
            user.password = undefined

            // cookie create and send response
            const options = {
                expires : new Date(Date.now() + 3*24*60*60*1000),
                httpOnly: true
            }
            res.cookie("token",token,options).status(200).json({
                success:true,
                token,
                user,
                message:"User Logged in successfully"
            })
        }
        else {
			return res.status(401).json({
				success: false,
				message: `Password is incorrect`,
			});
		}

    }
    catch(error){
        console.log(error);
        // Return 500 Internal Server Error status code with error message
        return res.status(500).json({
            success:false,
            message:"Login failure. Please try again!"
        })
    }
}


// change password
exports.changePassword = async (req, res) => {
	try {
		// Get user data from req.user
		const userDetails = await User.findById(req.user.id);

		// Get old password, new password, and confirm new password from req.body
		const { oldPassword, newPassword, confirmNewPassword } = req.body;

		// Validate old password
		const isPasswordMatch = await bcrypt.compare(oldPassword,userDetails.password);
		if (!isPasswordMatch) {
			// If old password does not match, return a 401 (Unauthorized) error
			return res.status(401).json({ success: false, message: "The password is incorrect" });
		}

		// Match new password and confirm new password
		if (newPassword !== confirmNewPassword) {
			// If new password and confirm new password do not match, return a 400 (Bad Request) error
			return res.status(400).json({
				success: false,
				message: "The password and confirm password does not match",
			});
		}

		// Update password
		const encryptedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUserDetails = await User.findByIdAndUpdate(
			req.user.id,
			{ password: encryptedPassword },
			{ new: true }
		);

		// Send notification email
		try {
			const emailResponse = await mailSender(
				updatedUserDetails.email,
				passwordUpdated(
					updatedUserDetails.email,
					`Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
				)
			);
			console.log("Email sent successfully:", emailResponse.response);
		} 
        catch (error) {
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
		}

		// Return success response
		return res.status(200).json({ success: true, message: "Password updated successfully" });
	} 
    catch (error) {
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
	}
};

