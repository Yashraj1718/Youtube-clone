// require('dotenv').config() // we are not using this thing bcz its breaks the consistency of the code 

import dotenv from 'dotenv';

// import mongoose from "mongoose";
// import {DB_NAME} from './constants';
import connectDB from "./db/index.js ";
import {app} from './app.js'


dotenv.config({
    path:'./.env'
})
 


connectDB()
.then(() => {
    app.listen((process.env.PORT || 8000),() => {
        console.log(`Server is running at port ${process.env.PORT}`);
        
    })
})
.catch((err) =>{
    console.log("MONGODB connection failed",err);
    
})













/*
import express from 'express'
const app = express()


( async () =>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        app.on(("error"),(error) =>{
            console.log("error:",error);
            throw error;
        })

        app.listen(process.env.PORT,() => {
            console.log(`App is listening on port ${process.env.PORT}`);
            
        })
        
    } catch (error) {
        console.log("error:",error);
        
        
    }
})
    */