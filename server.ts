import { createServer } from "https";
import next from "next";
import fs from "fs";
import { parse } from "url";

const app = next({ dev: true });
const handle = app.getRequestHandler();

const options = {
  key: fs.readFileSync("./localhost+2-key.pem"),
  cert: fs.readFileSync("./localhost+2.pem"),
};

app.prepare().then(() => {
  createServer(options, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, () => {
    console.log("HTTPS running at https://localhost:3000");
  });
});
