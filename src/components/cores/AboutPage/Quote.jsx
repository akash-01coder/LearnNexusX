import React from 'react'
import HighlightText from '../HomePage/HighLightText'

const Quote = () => {
  return (
    <div className="mx-auto py-20 text-4xl text-richblack-200 font-semibold lg:w-[90%]">
      We are passionate about revolutionizing the way we learn. Our innovative platform
      <HighlightText text={"combines technology"}/>
      <span className='text-brown-300'>
        {" "}
        expertise
      </span>
      , and community to create an 
      <span  className='text-brown-300'>
      {" "}
        unparalleled educational experience.
      </span>
    </div>
  )
}

export default Quote