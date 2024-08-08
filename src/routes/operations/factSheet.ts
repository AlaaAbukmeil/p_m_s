import { NextFunction, Router } from "express";
import { bucket, dateWithMonthOnly, generateSignedUrl, verifyToken } from "../../controllers/common";
import { getFactSheetData, trimFactSheetData } from "../../controllers/reports/factSheet";
import { addFactSheet, deleteFactSheet, editFactSheet, formatUpdateFactSheetEmail } from "../../controllers/operations/factSheet";
import { readFactSheet } from "../../controllers/operations/readExcel";
import { formatExcelDate } from "../../controllers/reports/common";
import { dateWithNoDay } from "../../controllers/common";
import { editFactSheetDisplay, getFactSheetDisplay } from "../../controllers/operations/commands";
import { uploadToBucket } from "../../controllers/userManagement/tools";
import { getAllUsers } from "../../controllers/userManagement/auth";
import { errorEmailFactSheetUser } from "../../controllers/operations/emails";
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
      let newRow: any = { date: data.month, data: {}, timestamp: new Date(fullDate[0] + "/01/" + fullDate[1]).getTime() };
      newRow.data[name] = parseFloat(data.price);
      let result = await addFactSheet(newRow, "Triada");
      console.log(result);
    } else if (name == "ma2" || name == "ma3" || name == "ma4" || name == "ma6") {
      let newRow: any = { date: data.month, data: {}, timestamp: new Date(fullDate[0] + "/01/" + fullDate[1]).getTime() };
      newRow.data[name] = parseFloat(data.price);
      let result = await addFactSheet(newRow, "Triada Master");
      console.log(result);
    } else {
      let newRow: any = { date: data.month, data: {}, timestamp: new Date(fullDate[0] + "/01/" + fullDate[1]).getTime() };
      newRow.data["main"] = parseFloat(data.price);
      let result = await addFactSheet(newRow, name);
      console.log(result);
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
      let result = await editFactSheet(newRow, "Triada", name);
    } else if (name == "ma2" || name == "ma3" || name == "ma4" || name == "ma6") {
      let newRow: any = { data: {}, id: data.id, month: data.month, price: data.price };

      newRow.data[name] = parseFloat(data.price);
      let result = await editFactSheet(newRow, "Triada Master", name);
      console.log(result, newRow);
    } else {
      let newRow: any = { data: {}, id: data.id, month: data.month, price: data.price };

      newRow.data["main"] = parseFloat(data.price);
      let result = await editFactSheet(newRow, name, "main");
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
    let data = req.body;
    let edit = await editFactSheetDisplay(data);
    res.sendStatus(200);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

factSheetRouter.post("/fact-sheet-update", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let allUser;
    if (req.body.target == "investor") {
      allUser = await getAllUsers();
    } else {
      allUser = [
        {
          name: "Alaa",
          email: "developer@triadacapital.com",
          shareClass: "a2 a3 mkt",
        },
      ];
    }
    let formatted = formatUpdateFactSheetEmail(req.body.email, allUser);

    for (let index = 0; index < formatted.length; index++) {
      const emailAction = formatted[index];
      let status = await errorEmailFactSheetUser({ email: emailAction.email, content: emailAction.text, subject: req.body.subject });
      console.log(emailAction.email, index, status);
    }
    res.sendStatus(200);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});
export default factSheetRouter;
