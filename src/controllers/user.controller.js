import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from '../models/user.model.js'
import {uploadCloudinary} from '../utils/cloudinary.js'
import { APiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { upload } from "../middlewares/multer.middleware.js";




const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)
      const accessToken =   user.generateAccessToken()
      const refreshToken =   user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})
      
        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

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

const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    throw new ApiError(404, "Username is required");
  }

  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User logged in successfully"
      )
    );
});

const logoutUser =  asyncHandler (async (req,res) => {
   await User.findByIdAndUpdate(
        req.user._id,{
            $set : {
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )
    const options =  {
        httpOnly: true,
        secure: true

    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new APiResponse (200),{},"User logged out successfully")
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken){
            throw new ApiError(401,"Unauthorized request")
        }
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
             throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly:true,
            secure: true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
        .cookies("accessToken",accessToken, options)
        .cookies("refreshToken",newRefreshToken,options)
        .json(
            new APiResponse(200,{accessToken,refreshToken: newRefreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const{ oldPassword, newPassword} = req.body 

  const user = await  User.findById(req.user?._id)
   const isPasswordCorrect = await  user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
    throw new ApiError(400,"Invalid Password")
   }

   user.password = newPassword

  await user.save({validateBeforeSave: false})

  return res.status(200)
  .json(new APiResponse(200,{},"Password changed suuccessfully"))

})


const getCurrentUser = asyncHandler(async(req,res) => {
    return res.status(200)
    .json(200,req.user,"Current User fetched successfully")
})

const updateUsername = asyncHandler(async(req,res) =>{
    const {fullname,email,username}= req.body

    if(!fullname || !email || !username){
         throw new ApiError(400,"All fields are required")
    }

   const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email:email, // above and this are same 
                username
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new APiResponse(200,user,"Account details updated successfully"))
})


const updateUserAvatar = asyncHandler(async(req,res) => {
   const avatarLocalPath =  req.file?.path

   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file missing")
   }

   const avatar = await uploadCloudinary(avatarLocalPath)

   if(!avatar.url){
    throw new ApiError(400,"Error while uploading error")
   }
 const user  =  await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set: {
            avatar: avatar.url
        }
    },
    {new:true}
  )
return res.status(200)
  .json(new APiResponse(200,user," Avatar has beenn updated successfully"))

})

const updateUserCoverImage = asyncHandler(async(req,res) => {
   const coverImageLocalPath =  req.file?.path

   if(!coverImageLocalPath){
    throw new ApiError(400,"Image file missing")
   }

   const coverImage = await uploadCloudinary(coverImageLocalPath)

   if(!coverImage.url){
    throw new ApiError(400,"Error while uploading error")
   }
   const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set: {
            coverImage: coverImage.url
        }
    },
    {new:true}
  )

  return res.status(200)
  .json(new APiResponse(200,user,"Cover image has beenn updates successfully"))


})



export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateUsername,updateUserAvatar,updateUserCoverImage}