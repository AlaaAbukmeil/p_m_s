import { NextFunction, Router } from "express";
import { image } from "../models/image";
import { registerUser, checkIfUserExists } from "../controllers/auth";
import { Request, Response } from "express"
import { verifyToken } from "../controllers/common";
import { getDate, getTime } from "../controllers/common";
import { readBloombergSheet, generateImagineEBlot, insertEBlotTransactions, getReport, readTriadaEBlot } from "../controllers/standardOperations";

require("dotenv").config()
const path = require('path');
const xlsx = require("xlsx")
const axios = require("axios")

const multerGoogleStorage = require("multer-google-storage");
const multer = require('multer')
const uploadBeforeExcel = multer({
  storage: multerGoogleStorage.storageEngine({
    autoRetry: true,
    bucket: process.env.BUCKET,
    projectId: process.env.PROJECTID,
    keyFilename: process.env.KEYPATHFILE,
    filename: (req: Request, file: image, cb: (err: boolean, fileName: string) => void) => {
      cb(false, `/before-excel/${Date.now()}_${file.originalname}`);
    }
  })
});



const router = Router();

router.get("/auth", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  res.sendStatus(200)
})

router.post("/signUp", async (req: Request, res: Response, next: NextFunction) => {


  let data = req.body
  let username = data.username
  let password = data.password
  let verificationCode = data.verificationCode
  let result = await registerUser(username, password, verificationCode)
  res.send(result)


})

router.get("/report", verifyToken, async (req: Request, res: Response, next: NextFunction) => {

  let report = await getReport()

  res.send(report)


})

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body
  let username = data.username
  let password = data.password
  let user = await checkIfUserExists(username, password)
  res.send(user)

})

router.post("/elec-blot", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const fileName = req.files[0].filename
  const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName
  const trader = req.body.trader
  const startegy = req.body.startegy
  let arr: any = await readBloombergSheet(path, trader, startegy)
  if (arr.error) {
    res.send(arr.error)
  } else {

    let eBlotName = await generateImagineEBlot(arr)
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + eBlotName
    res.send(downloadEBlotName)
  }
})

router.post("/update-internal-db", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const fileName = req.files[0].filename
  const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName
  let action: any = await readTriadaEBlot(path)
  if (action?.error) {
    res.send(action.error)
  }else{
  res.sendStatus(200)
  }
})


export default router;