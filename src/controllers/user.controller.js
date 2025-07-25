import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadCloudinary} from '../utils/cloudinary.js'
import { APiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req,res) => {
    console.log("🔥 registerUser function called"); // Add this at the very top
 
 // get user details from frontend
   const {fullname,email,username,password}  = req.body
   console.log("email: ",email);
   
// validation - not empty

//    if(fullname === ""){
//     throw new ApiError(400, "Fullname is required")
//    }
if([fullname,email,username,password].some( (field) => field?.trim() === "" )
){
    throw new ApiError(400,"All fields are required")
}

 // check if user already exists : username,email

   const existedUser = await User.findOne({
        $or : [ {username} , {email} ]
    })

    if(existedUser) {
        throw new ApiError(409,"User with email or username laready exists" )
    }

    

// check for images, check for avatar
 
 const avatarLocalPath = req.files?.avatar[0]?.path;
 const coverImageLocalPath = req.files?.coverImage[0]?.path;

 if(!avatarLocalPath) {
    throw new ApiError(400,"Avatar is required")
 }



// upload them to cloudinary, avatar

  const avatar =  await uploadCloudinary(avatarLocalPath)
  const coverImage = await uploadCloudinary(coverImageLocalPath)
  
  if(!avatar) {
    throw new ApiError(400,"Avatar is required")
  }
   

// create user object - create entry in db

 const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })
  


 // remove password and refresh token field from response


 const createdUser =  await User.findById(user._id).select(
    "-password -refreshToken"
 )

 // check for user creation 
 if(!createdUser) {
    throw new ApiError(500,"Something went wrong while registering user")
 }

   // return res

    return res.status(201).json(
        new APiResponse(200,createdUser , "User registered Successfully")
    )


})

export {registerUser}