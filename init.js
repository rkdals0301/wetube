import { connectDatabase } from "./db";
import app from "./app";
import "./models/Video";
import "./models/Comment";

const PORT = process.env.PORT || 4000;

connectDatabase()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`✅  Listening on: http://localhost:${server.address().port}`);
    });
  })
  .catch(() => {
    console.error("Could not connect to MongoDB. Check MONGO_URL and database availability.");
    process.exitCode = 1;
  });
