import * as prog from "caporal";
import {createTcpClient} from "..";

const pkg = require('../package.json');

export function run(argv) {
  prog
    .version(pkg.version)
    .description('Start sunnel client')
    .option("-l, --host <service-host>", "Name or IP address of service host", prog.STRING, undefined, true)
    .option("-s, --port <service-port>", "Service port number", prog.INT, undefined, true)
    .option("-h, --relay-host <relay-host>", "Name or IP address of relay server host", prog.STRING, undefined, true)
    .option("-r, --relay-port <relay-port>", "Relay server port number", prog.INT, undefined, true)
    .option("-c, --num-conn [num-conn]", "Number of connections to maintain with relay", prog.INT, 1)
    .option("-k, --secret [key]", "Secret key to send to relay host")
    .option("-t, --tls [both]", "Use TLS", undefined, false)
    .option("-u, --reject-unauthorized [value]", "Do not accept invalid certificate", undefined, false)
    .action((args, opts) => {
      const client = createTcpClient(opts.host, opts.port, opts.relayHost, opts.relayPort, opts);

      process.on("SIGINT", () => {
        client.end();
      });
    });


  prog.parse(argv)
}

