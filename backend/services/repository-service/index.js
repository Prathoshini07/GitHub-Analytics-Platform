const express = require("express");
const mongoose = require("mongoose");
const repoRoutes = require("./routes/repoRoutes");
const client = require("prom-client"); 
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5003;

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
app.use("/repos", repoRoutes);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

const ATLAS_URI = process.env.MONGO_URI;

const connectWithRetry = () => {
  mongoose
    .connect(ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

app.listen(PORT, () => {
  console.log(`Repository Service is running on port ${PORT}`);
});