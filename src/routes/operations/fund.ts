import { Router } from "express";
import { verifyToken } from "../../controllers/common";
import { Request, Response, NextFunction } from "express";
import { addFund, deleteFund, editFund, getAllFundDetails } from "../../controllers/operations/fund";
import { monthlyRlzdDate } from "../../controllers/reports/common";
import { FundDetails } from "../../models/portfolio";
import { uploadToBucket } from "../../controllers/userManagement/tools";

const fundRouter = Router();

fundRouter.post("/edit-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action = await editFund(req.body);

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });
  }
});

fundRouter.post("/delete-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log(req.body, "before");
    let action = await deleteFund(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });

  }
});


fundRouter.post("/add-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body
    data["portfolio_id"] = "portfolio_main"
    console.log(data, "before");
    let action = await addFund(data);
    if (action.error) {
      res.send({ error: action.error });
    } else {
      res.sendStatus(200);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });

  }
});

fundRouter.get("/fund-details", verifyToken, async (req, res) => {
  try {
    const date: any = req.query.date;
    let thisMonth = monthlyRlzdDate(date);
    let fundDetails: FundDetails[] = await getAllFundDetails(thisMonth, "portfolio_main");
    res.send(fundDetails);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

export default fundRouter