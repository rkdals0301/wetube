const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const { readdirSync } = require("node:fs");
const path = require("node:path");
const { createInterface } = require("node:readline");
const test = require("node:test");
const mongoose = require("mongoose");
const pug = require("pug");

const root = path.resolve(__dirname, "..");
const views = path.join(root, "views");

test("all Pug templates compile", () => {
  const templates = readdirSync(views, { recursive: true }).filter((file) => file.endsWith(".pug"));
  assert.ok(templates.length > 0);
  for (const file of templates) {
    assert.doesNotThrow(() => pug.compileFile(path.join(views, file)), file);
  }
});

test("the app connects to MongoDB and renders pages", { timeout: 45_000 }, async (t) => {
  const serverUrl = process.env.TEST_MONGO_URL;
  if (!serverUrl) {
    t.skip("TEST_MONGO_URL is required for the MongoDB integration test");
    return;
  }

  const dbName = `wetube_test_${randomUUID().replaceAll("-", "")}`;
  const connection = mongoose.createConnection(serverUrl, { dbName, serverSelectionTimeoutMS: 5_000 });
  t.after(async () => {
    try {
      if (connection.readyState === 1) await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });
  await connection.asPromise();
  await connection.collection("videos").insertOne({
    title: "CI video from MongoDB",
    fileUrl: "/example.mp4",
    views: 1,
  });

  const mongoUrl = new URL(serverUrl);
  mongoUrl.pathname = `/${dbName}`;
  const child = spawn(process.execPath, [require.resolve("@babel/node/bin/babel-node"), "init.js"], {
    cwd: root,
    env: { ...process.env, MONGO_URL: mongoUrl.href, PORT: "0" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  const closed = once(child, "close");
  t.after(async () => {
    child.kill();
    await closed;
  });

  const lines = createInterface({ input: child.stdout });
  let port;
  try {
    for await (const line of lines) {
      port = line.match(/Listening on: http:\/\/localhost:(\d+)/)?.[1];
      if (port) break;
    }
  } finally {
    lines.close();
  }
  assert.ok(port, "the app must finish connecting and start listening");

  for (const [route, content] of [
    ["/", "CI video from MongoDB"],
    ["/login", "Log In"],
    ["/join", "Join Now"],
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 200, route);
    assert.match(await response.text(), new RegExp(content));
  }
});
