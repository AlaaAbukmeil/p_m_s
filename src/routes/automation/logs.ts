import { Router } from "express";
import { verifyToken } from "../../controllers/common";
import { Request, Response, NextFunction } from "express";
import { FundDetails } from "../../models/portfolio";
import { uploadToBucket } from "../../controllers/userManagement/tools";
import { getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { insertEditLogs } from "../../controllers/operations/logs";

const logRouter = Router();

logRouter.post("/automation-logs", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());

    await insertEditLogs([data.errorMessage], "errors", dateTime, data.functionName, data.functionPosition);

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });
  }
});

export default logRouter;
