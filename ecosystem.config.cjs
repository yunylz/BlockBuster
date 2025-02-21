module.exports = {
  apps: [{
    name: "blockbuster-prod",
    script: "npm",
    args: "run dev",
    cwd: "./",
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    time: true,
    exec_mode: "fork",
    instances: 1,
    autorestart: true,
    max_restarts: 10,
    watch: false,
    max_memory_restart: "1G"
  }]
}