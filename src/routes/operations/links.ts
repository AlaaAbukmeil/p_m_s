import { NextFunction, Router } from "express";
import { addLink, deleteLink, editLink, getLinks } from "../../controllers/operations/links";
import { verifyToken } from "../../controllers/common";
import { uploadToBucket } from "../../controllers/userManagement/tools";
const linksRouter = Router();

linksRouter.get("/links", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let links = await getLinks();
    res.send(links);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

linksRouter.post("/edit-link", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let action = await editLink(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });
  }
});

linksRouter.post("/delete-link", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
      let action = await deleteLink(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });
  }
});

linksRouter.post("/add-link", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let action = await addLink(req.body);
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

export default linksRouter;
