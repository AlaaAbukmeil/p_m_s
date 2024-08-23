import { NextFunction, Router } from "express";
import { bucket, bucketPublic, dateWithMonthOnly, generateSignedUrl, verifyToken } from "../../controllers/common";
import { getFactSheetData, trimFactSheetData } from "../../controllers/reports/factSheet";
import { addFactSheet, deleteFactSheet, editFactSheet, formatUpdateEmail } from "../../controllers/operations/factSheet";
import { readFactSheet } from "../../controllers/operations/readExcel";
import { formatExcelDate } from "../../controllers/reports/common";
import { dateWithNoDay } from "../../controllers/common";
import { editFactSheetDisplay, getFactSheetDisplay } from "../../controllers/operations/commands";
import { bucketPublicTest, multerTest, uploadToBucket } from "../../controllers/userManagement/tools";
import { getAllUsers } from "../../controllers/userManagement/auth";
import { sendUpdateEmail } from "../../controllers/operations/emails";
import { FactSheetFundDataInDB } from "../../models/factSheet";
const { v4: uuidv4 } = require("uuid");
const factSheetRouter = Router();

factSheetRouter.get("/fact-sheet-data", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    const from2010: any = new Date("2010-01-01").getTime();
    const now = new Date().getTime();

    let data = await getFactSheetData("Triada", from2010, now, "a2");
    let dataMaster = await getFactSheetData("Triada Master", from2010, now, "ma2");
    let display = await getFactSheetDisplay("view");

    let treasuryData = await getFactSheetData("3 Month Treasury", from2010, now, "main");
    let legatruu = await getFactSheetData("LEGATRUU Index", from2010, now, "main");
    let emustruu = await getFactSheetData("EMUSTRUU Index", from2010, now, "main");
    let beuctruu = await getFactSheetData("BEUCTRUU Index", from2010, now, "main");
    let beuytruu = await getFactSheetData("BEUYTRUU Index", from2010, now, "main");
    let lg30truu = await getFactSheetData("LG30TRUU Index", from2010, now, "main");
    let bebgtruu = await getFactSheetData("BEBGTRUU Index", from2010, now, "main");
    let pimglba = await getFactSheetData("PIMGLBA ID Equity", from2010, now, "main");
    let fiditbd = await getFactSheetData("FIDITBD LX Equity", from2010, now, "main");

    let others = {
      "3 Month Treasury": treasuryData,
      "LEGATRUU Index": legatruu,
      "EMUSTRUU Index": emustruu,
      "BEUCTRUU Index": beuctruu,
      "BEUYTRUU Index": beuytruu,
      "LG30TRUU Index": lg30truu,
      "BEBGTRUU Index": bebgtruu,
      "PIMGLBA ID Equity": pimglba,
      "FIDITBD LX Equity": fiditbd,
    };

    let formmated = trimFactSheetData(data, dataMaster, others);
    res.send({ formmated, display });
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

factSheetRouter.post("/add-fact-sheet", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let data = req.body;
    let name = data.name;
    let fullDate = data.month.split("/");
    if (name == "a2" || name == "a3" || name == "a4" || name == "a5" || name == "a6") {
      let id = uuidv4();

      let newRow: FactSheetFundDataInDB = { date: data.month, data: {}, timestamp: new Date(fullDate[0] + "/01/" + fullDate[1]).getTime(), fund: "Triada Master", id: id };
      newRow.data[name] = parseFloat(data.price);
      let result = await addFactSheet(newRow, "Triada");
    }
    res.sendStatus(200);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

factSheetRouter.post("/edit-fact-sheet", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let data = req.body;
    let name = data.name;
    if (name == "a2" || name == "a3" || name == "a4" || name == "a5" || name == "a6") {
      let newRow: any = { data: {}, id: data.id };

      newRow.data[name] = parseFloat(data.price);
      let result = await editFactSheet(newRow, "Triada", name, data.id);
    } else if (name == "ma2" || name == "ma3" || name == "ma4" || name == "ma6") {
      let newRow: any = { data: {}, id: data.id, month: data.month, price: data.price };

      newRow.data[name] = parseFloat(data.price);
      let result = await editFactSheet(newRow, "Triada Master", name, data.id);
    } else {
      let newRow: any = { data: {}, id: data.id, month: data.month, price: data.price };

      newRow.data["main"] = parseFloat(data.price);
      let result = await editFactSheet(newRow, name, "main", data.id);
    }
    res.sendStatus(200);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

factSheetRouter.post("/delete-fact-sheet-data", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let data = req.body;
    let name = data.name;
    if (name == "a2" || name == "a3" || name == "a4" || name == "a5" || name == "a6") {
      let result = await deleteFactSheet(data, "Triada");
    } else if (name == "ma2" || name == "ma3" || name == "ma4" || name == "ma6") {
      let result = await deleteFactSheet(data, "Triada Master");
    } else {
      let result = await deleteFactSheet(data, name);
    }
    res.sendStatus(200);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

factSheetRouter.post("/fact-sheet-data-input", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let files = req.files;
    const fileName = files[0].filename;
    const path = await generateSignedUrl(fileName);
    let data: any = await readFactSheet(path);
    let map: any = {};
    for (let index = 0; index < data.length; index++) {
      let element = data[index];
      let newDate = dateWithMonthOnly(formatExcelDate(element.Date));
      map[newDate] = {};
      map[newDate].ma2 = element.A2;
      map[newDate].ma3 = element.A3;
      map[newDate].ma4 = element.A4;
      map[newDate].ma6 = element.A6;
    }
    console.log(map);

    res.send(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

factSheetRouter.post("/edit-fact-sheet-view", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let data: { command: "view"; disabled: boolean } = req.body;
    let edit = await editFactSheetDisplay(data);
    res.sendStatus(200);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

factSheetRouter.post("/email-update", verifyToken, multerTest.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    const files = req.files;
    let newFileNames: any = [];
    let newUrls: { url: string }[] = [];

    const uploadFile = (file: any) => {
      return new Promise((resolve, reject) => {
        const blob = bucketPublicTest.file(file.originalname);
        newFileNames.push(file.originalname);
        const blobStream = blob.createWriteStream();

        blobStream.on("error", (err: any) => {
          reject(err);
        });

        blobStream.on("finish", () => {
          const publicUrl = `${bucketPublic}/${blob.name}`;
          newUrls.push({ url: publicUrl });
          resolve(null);
        });

        blobStream.end(file.buffer);
      });
    };
    await Promise.all(files.map((file: any) => uploadFile(file)));
    let allUsers: any = [];
    let shareClasses = req.body.shareClass.toString().split(" ");
    if (req.body.target === "investor") {
      let allUsersInDB = await getAllUsers();

      if (req.body.shareClass != "") {
        for (let index = 0; index < allUsersInDB.length; index++) {
          const user = allUsersInDB[index];
          let userShareClasses = user["shareClass"].toString().split(" ");

          for (let shareClass of shareClasses) {
            if (userShareClasses.includes(shareClass)) {
              allUsers.push(user);
              break;
            }
          }
        }
      } else {
        for (let index = 0; index < allUsersInDB.length; index++) {
          const user = allUsersInDB[index];
          allUsers.push(user);
        }
      }
    } else {
      allUsers.push({
        name: "Alaa",
        email: "developer@triadacapital.com",
        shareClass: "a2 a3 mkt",
      });
    }
    let formatted = formatUpdateEmail(req.body.email, allUsers);
    for (let index = 0; index < formatted.length; index++) {
      const emailAction = formatted[index];
      let status = await sendUpdateEmail({ email: emailAction.email, content: emailAction.text, subject: req.body.subject, attachment: newUrls });
      console.log(emailAction.email, index, status);
    }
    res.sendStatus(200);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});
export default factSheetRouter;
