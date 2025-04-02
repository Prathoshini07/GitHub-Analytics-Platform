const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const commitRoutes = require("./routes/commitRoutes");
const client = require("prom-client"); 

const app = express();
const PORT = process.env.PORT || 5004;

client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['route', 'status'],
});

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({ route: req.path, status: res.statusCode });
  });
  next();
});

app.use(express.json());
app.use("/commits", commitRoutes);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log(`Commits Service on ${PORT}`);
});