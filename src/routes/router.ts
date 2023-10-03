import { NextFunction, Router } from "express";
import { image } from "../models/image";
import { registerUser, checkIfUserExists } from "../controllers/auth";
import { Request, Response } from "express"
import { getDate, verifyToken, formatDateVconFile } from "../controllers/common";
import { updatePositionPortfolio, getPortfolioWithAnalytics, getHistoricalPortfolioWithAnalytics, updatePricesPortfolio, uploadPortfolioFromImagine, getTrades } from "../controllers/portfolioOperations";
import { bloombergToTriada, uploadTriadaAndReturnFilePath, } from "../controllers/portfolioFunctions";
import { checkIfSecurityExist } from "../controllers/tsImagineOperations"
import { uploadVconAndReturnFilePath, formatNomuraEBlot } from "../controllers/vconOperation";
import { getGraphToken, getVcons } from "../controllers/graphApiConnect";

require("dotenv").config()


const readLastLines = require('read-last-lines');
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

router.get("/portfolio", verifyToken, async (req: Request, res: Response, next: NextFunction) => {

  const date: any = req.query.date;

  let report = (date == "current") ? await getPortfolioWithAnalytics() : await getHistoricalPortfolioWithAnalytics(date)

  res.send(report)


})

router.get('/trades-logs', verifyToken, async (req, res) => {
  try {
    const filePath = path.resolve('trades-logs.txt');
    const lastLines = await readLastLines.read(filePath, 500);
    res.send(lastLines);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred while reading the file.');
  }
});

router.get('/prices-logs', verifyToken, async (req, res) => {
  try {
    const filePath = path.resolve('prices-logs.txt');
    const lastLines = await readLastLines.read(filePath, 500);
    res.send(lastLines);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred while reading the file.');
  }
});

router.get('/trades', verifyToken, async (req, res) => {
  try {
    let trades = await getTrades()
    // console.log(trades)
    res.send(trades);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred while reading the file.');
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body
  let username = data.username
  let password = data.password
  let user = await checkIfUserExists(username, password)
  res.send(user)

})

router.post("/signUp", async (req: Request, res: Response, next: NextFunction) => {


  let data = req.body
  let username = data.username
  let password = data.password
  let verificationCode = data.verificationCode
  let result = await registerUser(username, password, verificationCode)
  res.send(result)


})

router.post("/elec-blot", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const fileName = req.files[0].filename
  const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName
  const trader = req.body.trader
  const startegy = req.body.startegy
  let arr: any = await bloombergToTriada(path, trader, startegy) // array
  if (arr.error) {
    res.send(arr.error)
  } else {

    let eBlotName = await uploadTriadaAndReturnFilePath(arr) // 
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + eBlotName
    res.send(downloadEBlotName)
  }
})

router.post("/upload-trades", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const fileName = req.files[0].filename
  const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName
  try {
    let action: any = await updatePositionPortfolio(path)//updatePositionPortfolio
    res.send(action)
  } catch (error) {
    res.send({ "error": error })
  }

})

router.post("/update-prices", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const fileName = req.files[0].filename
  const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName
  // console.log(date)
  let action: any = await updatePricesPortfolio(path)
  console.log(action)
  if (action?.error) {
    res.send({ "error": action.error })
  } else {
    res.sendStatus(200)
  }
})

router.post("/check-isin", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const fileName = req.files[0].filename
  const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName
  let action = await checkIfSecurityExist(path)
  // console.log(action)
  if (action?.error) {
    res.send({ "error": action.error })
  } else {
    res.send(action)
  }
})

router.post("/vcon-excel-nomura", uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body
  let pathName = formatDateVconFile(data.timestamp_start) + "xxxx" + formatDateVconFile(data.timestamp_end)
  // console.log(pathName)
  //let array: any = []//await readEmails(data.timestamp_start, data.timestamp_end)
  let token = await getGraphToken()
  let array: any = await getVcons(token, data.timestamp_start, data.timestamp_end)
  let arrayFormatedNomura = formatNomuraEBlot(array)
  // console.log(array)
  // console.log(array)
  if (array.length == 0) {
    res.send({ error: "No Trades" })
  } else {
    let vcons = await uploadVconAndReturnFilePath(arrayFormatedNomura, pathName)
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + vcons
    // console.log(array)
    res.send(downloadEBlotName)
  }
})

router.post("/vcon-excel", uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body
  let pathName = formatDateVconFile(data.timestamp_start) + "xxxx" + formatDateVconFile(data.timestamp_end)
  // console.log(pathName)
  //let array: any = []//await readEmails(data.timestamp_start, data.timestamp_end)
  let token = await getGraphToken()
  let array: any = await getVcons(token, data.timestamp_start, data.timestamp_end)
  // console.log(array)
  if (array.length == 0) {
    res.send({ error: "No Trades" })
  } else {
    let vcons = await uploadVconAndReturnFilePath(array, pathName)
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + vcons
    // console.log(array)
    res.send(downloadEBlotName)
  }
})




export default router;