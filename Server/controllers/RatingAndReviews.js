const RatingAndReview = require("../models/RatingAndReview");
const Course = require("../models/Course");
const mongoose = require("mongoose");

// create rating
exports.createRating = async(req,res) => {
    try{
        // get user id
        const userId = req.user.id;

        // fatch data from request ki body
        const {rating,review,courseId} = req.body;

        // check if user is enrolled or not
        const courseDetails = await Course.findOne({_id:courseId, studentsEnrolled:{$elemMatch : {$eq: userId} }});
        if(!courseDetails){
            return res.status(404).json({
                success:false,
                message:"Student not enrolled in the course"
            })
        };

        // check if user already reviewed the course
        const alreadyReviewed = await RatingAndReview.findOne({user:userId,course:courseId});
        if(alreadyReviewed){
            return res.status(403).json({
                success:false,
                message:"Student already reviewed the course"
            })
        }

        // create rating and review
        const ratingReview = await RatingAndReview.create({review,rating,course:courseId,user:userId});

        // update course with this rating/review
        const updatedCourseDetails = await Course.findByIdAndUpdate({id:courseId}, {$push : {ratingAndReviews:ratingReview._id}}, {new:true});
        console.log(updatedCourseDetails);

        // return response
        return res.status(200).json({
            success:true,
            message:"Rating and review created successfully",
            ratingReview
        })

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }

}



// get Average rating
exports.getAverageRating = async(req,res) => {
    try{
        // get courseId
        const courseId = req.body.courseId;

        // calculate average rating
        const result = await RatingAndReview.aggregate([
            {$match : { course : new mongoose.Types.ObjectId(courseId) }  },
            {$group : {_id:null, averageRating: {$avg: "$rating"}  }  }
        ])

        // return rating
        if(result.length>0){
            return res.status(200).json({
                success:true,
                averageRating : result[0].averageRating
            })
        }

        // if no rating/review exist
        return res.status(200).json({
            success:true,
            message:"Average rating is 0, no rating given till now",
            averageRating:0
        })

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
}



// get all rating
exports.getAllRating = async(req,res) => {
    try{
        // get all reviews and ratings
        const allReviews = await RatingAndReview.find({}).sort({rating:"desc"}).
                            populate({path:"user", select:"firstName lastName email image"}).
                            populate({path:"course", select:"courseName"}).exec();

        return res.status(200).json({
            success:true,
            message:"All reviews fetched successfully",
            data:allReviews
        })

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
}


