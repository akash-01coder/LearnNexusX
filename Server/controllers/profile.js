const Profile = require("../models/Profile");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const CourseProgress = require("../models/CourseProgress");
const Course = require("../models/Course");
const mongoose = require("mongoose")
const { convertSecondsToDuration } = require("../utils/secToDuration")

// only need to update profile, as profile is already created
// handler function of update profile
exports.updateProfile = async (req, res) => {
  try {
    // get data
    const {
      firstName = "",
      lastName = "",
      dateOfBirth = "",
      about = "",
      contactNumber = "",
      gender = "",
    } = req.body;

    // get userId
    const id = req.user.id;

    // find profile by id
    const user = await User.findById(id);
    const profileId = user.additionalDetails;
    const profileDetails = await Profile.findById(profileId);


    const userd = await User.findByIdAndUpdate(id, {
      firstName,
      lastName,
    })
    await user.save();


    // update profile
    profileDetails.dateOfBirth = dateOfBirth;
    profileDetails.about = about;
    profileDetails.gender = gender;
    profileDetails.contactNumber = contactNumber;

    // save the updated profile
    await profileDetails.save();

    const updatedUserDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()

    // return response
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails
    })

  }
  catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile. Please try again",
      error: error.message
    })
  }
}


// delete profile
// explore -> how can we schedule this delete operation
exports.deleteProfile = async (req, res) => {
  try {
    // get id
    const id = req.user.id;

    const user = await User.findById({ _id: id })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Delete Assosiated Profile with the User
    await Profile.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(user.additionalDetails),
    })
    for (const courseId of user.courses) {
      await Course.findByIdAndUpdate(
        courseId,
        { $pull: { studentsEnroled: id } },
        { new: true }
      )
    }
    // Now Delete User
    await User.findByIdAndDelete({ _id: id })
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })

    await CourseProgress.deleteMany({ userId: id })

  }
  catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete profile. Please try again"
    })
  }
}

// get user details
exports.getAllUserDetails = async (req, res) => {
  try {
    // get id
    const id = req.user.id;
    // validate and get user details
    const userDetails = await User.findById(id).populate("additionalDetails").exec();
    console.log(userDetails);
    // return response
    return res.status(200).json({
      success: true,
      message: "User data fetched successfully",
      data: userDetails
    })
  }
  catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Unable to get user details",
      error: error.message
    })
  }
}


// updateDisplayPicture
exports.updateDisplayPicture = async (req, res) => {
  try {
    const displayPicture = req.files.displayPicture
    const userId = req.user.id
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    )
    console.log(image)
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true }
    )
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
};

// getEnrolledCourses
exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id
    const userDetails = await User.findOne({
      _id: userId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .exec()


    // userDetails = userDetails.toObject()
    // var SubsectionLength = 0
    // for (var i = 0; i < userDetails.courses.length; i++) {
    //   let totalDurationInSeconds = 0
    //   SubsectionLength = 0
    //   for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
    //     totalDurationInSeconds += userDetails.courses[i].courseContent[
    //       j
    //     ].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)
    //     userDetails.courses[i].totalDuration = convertSecondsToDuration(
    //       totalDurationInSeconds
    //     )
    //     SubsectionLength +=
    //       userDetails.courses[i].courseContent[j].subSection.length
    //   }
    //   let courseProgressCount = await CourseProgress.findOne({
    //     courseID: userDetails.courses[i]._id,
    //     userId: userId,
    //   })
    //   courseProgressCount = courseProgressCount?.completedVideos.length
    //   if (SubsectionLength === 0) {
    //     userDetails.courses[i].progressPercentage = 100
    //   } else {
    //     // To make it up to 2 decimal point
    //     const multiplier = Math.pow(10, 2)
    //     userDetails.courses[i].progressPercentage =
    //       Math.round(
    //         (courseProgressCount / SubsectionLength) * 100 * multiplier
    //       ) / multiplier
    //   }
    // }

    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find user with id: ${userDetails}`,
      })
    }
    return res.status(200).json({
      success: true,
      data: userDetails.courses,
    })
  }
  catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
};



exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id })

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = course.studentsEnrolled.length
      const totalAmountGenerated = totalStudentsEnrolled * course.price

      // Create a new object with the additional fields
      const courseDataWithStats = {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        // Include other course properties as needed
        totalStudentsEnrolled,
        totalAmountGenerated,
      }

      return courseDataWithStats
    })
    
    res.status(200).json({ courses: courseData })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}
