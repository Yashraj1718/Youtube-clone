const  asyncHandler = (requestHandler) =>{
    return (req,res,next) =>{
    Promise.resolve(requestHandler(req,res,next)).catch((err) =>
        next(err))
}
}

export {asyncHandler}


//const asyncHandler = () => {}
//const asyncHandler = (function) => () => {}
//const asyncHandler = (function) => async () =. {}
// 
//                                    
//
//this above thing is called higherorder function which taked function as paramerter so basically thing functtion act as a variable here




// this is how u can also write it but 1st is hard but you should both types to write it
// const asyncHandler = (fn) => async(req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
        
//     }
// }
