import * as program from "commander";
import {createTcpClient} from "..";

const pkg = require('../package.json');

export function run(argv) {
  program
    .usage("[options]")
    .version(pkg.version)
    .option("-n, --host <host>", "Name or IP address of service host")
    .option("-s, --port <n>", "Service port number", parseInt)
    .option("-h, --relayHost <relayHost>", "Name or IP address of relay host")
    .option("-r, --relayPort <n>", "Relay port number", parseInt)
    .option("-c, --numConn [numConn]","Number of connections to maintain with relay", 1)
    .option("-k, --secret [key]", "Secret key to send to relay host")
    .option("-t, --tls [both]", "Use TLS", false)
    .option("-u, --rejectUnauthorized [value]", "Do not accept invalid certificate", false)
    .parse(argv);

  const options = {
    numConn: program.numConn,
    tls: program.tls,
    secret: program.secret,
    rejectUnauthorized: program.rejectUnauthorized
  };

  const client = createTcpClient(program.host, program.port, program.relayHost, program.relayPort, options);

  process.on("SIGINT", () => {
    client.end();
  });

  return client;
}

