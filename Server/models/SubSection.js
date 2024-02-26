const mongoose = require("mongoose");

const subSectionSchema = new mongoose.Schema({

    title:{
        type:String,
    },
    timeDuration:{
        type:String,
    },
    description:{
        type:String
    },
    videoUrl:{
        type:String
    }
});
if (mongoose.models.SubSection) {
    // Model already exists, use it
    module.exports = mongoose.models.SubSection;
  } else {
    // Define the model
    const SubSection = mongoose.model('SubSection', subSectionSchema);
    module.exports = SubSection;
  }

// module.exports = mongoose.model("SubSection",subSectionSchema);