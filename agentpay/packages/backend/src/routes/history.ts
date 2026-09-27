import { Hono } from "hono";
import { getSpendHistory } from "../db";

const history = new Hono();

history.get("/:cardId", (c) => {
  const records = getSpendHistory(c.req.param("cardId"));
  return c.json(records);
});

export default history;
