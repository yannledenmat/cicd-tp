const fs = require("fs");
const path = require("path");
const express = require("express");
const { register, Gauge } = require("prom-client");

// Define Prometheus metrics
const totalTests = new Gauge({
  name: "allure_tests_total",
  help: "Total number of tests",
});
const passedTests = new Gauge({
  name: "allure_tests_passed",
  help: "Number of passed tests",
});
const failedTests = new Gauge({
  name: "allure_tests_failed",
  help: "Number of failed tests",
});
const skippedTests = new Gauge({
  name: "allure_tests_skipped",
  help: "Number of skipped tests",
});
const avgDuration = new Gauge({
  name: "allure_tests_avg_duration_milliseconds",
  help: "Average test duration in milliseconds",
});

const app = express();
const ALLURE_RESULTS_DIR = path.join(__dirname, "..", "allure-results");

// Function to parse Allure results and update metrics
function updateMetrics() {
  const files = fs
    .readdirSync(ALLURE_RESULTS_DIR)
    .filter((f) => f.endsWith(".json"));
  let total = 0,
    passed = 0,
    failed = 0,
    skipped = 0;
  const durations = [];

  files.forEach((file) => {
    const data = JSON.parse(
      fs.readFileSync(path.join(ALLURE_RESULTS_DIR, file), "utf8"),
    );
    console.log(`Debug: ${file} - status: ${data.status}, time:`, data.time);  // Temporary debug log
    if (data.status) {
      total++;
      if (data.status === "passed") passed++;
      else if (data.status === "failed") failed++;
      else if (data.status === "skipped") skipped++;
      
      // Handle time as either an object with duration or a direct number
      let duration = 0;
      if (typeof data.time === 'number') {
        duration = data.time;
      } else if (data.time && typeof data.time === 'object' && data.time.duration) {
        duration = data.time.duration;
      }
      if (duration > 0) durations.push(duration);
    }
  });

  totalTests.set(total);
  passedTests.set(passed);
  failedTests.set(failed);
  skippedTests.set(skipped);
  avgDuration.set(
    durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0,
  );
}

// Endpoint for Prometheus to scrape
app.get("/metrics", async (req, res) => {
  updateMetrics(); // Refresh metrics on each scrape
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Start the server
const PORT = process.env.PORT || 9091; // Use a port not conflicting with your app
app.listen(PORT, () => {
  console.log(`Allure Prometheus exporter listening on port ${PORT}`);
});
