import {EventEmitter} from "events";
import * as net from "net";
import * as tls from 'tls';

export function createTcpClient(host, port, relayHost, relayPort, numConn) {
  return new TcpClient(host, port, relayHost, relayPort, numConn);
}

export class TcpClient extends EventEmitter {
  host: string;
  port: number;
  relayHost: string;
  relayPort: number;
  numConn: number;
  endCalled;
  options;
  clients;

  constructor(host, port, relayHost, relayPort, options) {
    super();
    this.host = host;
    this.port = port;
    this.relayHost = relayHost;
    this.relayPort = relayPort;
    if (typeof options === 'number') {
      this.numConn = options;
    } else {
      this.numConn = options.numConn;
      this.options = options;
    }
    this.clients = [];

    for (let i = 0; i < this.numConn; i++) {
      this.clients[this.clients.length] =
        this.createClient(host, port, relayHost, relayPort, options);
    }
  }


  createClient(host, port, relayHost, relayPort, options) {
    const relayClient = this;
    const client = new Client(host, port, relayHost, relayPort, options);
    client.on("pair", () => {
      relayClient.clients[relayClient.clients.length] =
        relayClient.createClient(host, port, relayHost, relayPort, options);
    });
    client.on("close", () => {
      const i = relayClient.clients.indexOf(client);
      if (i != -1) {
        relayClient.clients.splice(i, 1);
      }
      setTimeout(() => {
        if (relayClient.endCalled) return;
        relayClient.clients[relayClient.clients.length] =
          relayClient.createClient(host, port, relayHost, relayPort,
            options);
      }, 5000);
    });
    return client;
  };

  end() {
    this.endCalled = true;
    for (let i = 0; i < this.clients.length; i++) {
      this.clients[i].removeAllListeners();
      this.clients[i].relaySocket.destroy();
    }
  };

}


class Client extends EventEmitter {
  options;
  serviceSocket;
  bufferData: boolean;
  buffer;
  relaySocket;


  constructor(host, port, relayHost, relayPort, options) {
    super();
    this.options = options;
    this.serviceSocket = undefined;
    this.bufferData = true;
    this.buffer = [];

    const client = this;
    if (client.options.tls) {
      client.relaySocket = tls.connect(relayPort, relayHost, {
        rejectUnauthorized: client.options.rejectUnauthorized
      }, () => {
        client.authorize();
      });
    } else {
      client.relaySocket = new net.Socket();
      client.relaySocket.connect(relayPort, relayHost, () => {
        client.authorize();
      });
    }
    client.relaySocket.on("data", data => {
      if (client.serviceSocket == undefined) {
        client.emit("pair");
        client.createServiceSocket(host, port);
      }
      if (client.bufferData) {
        client.buffer[client.buffer.length] = data;
      } else {
        client.serviceSocket.write(data);
      }
    });
    client.relaySocket.on("close", hadError => {
      if (client.serviceSocket != undefined) {
        client.serviceSocket.destroy();
      } else {
        client.emit("close");
      }
    });
    client.relaySocket.on("error", error => {
    });
  }


  authorize() {
    if (this.options.secret) {
      this.relaySocket.write(this.options.secret);
    }
  };

  createServiceSocket(host, port) {
    const client = this;
    if (client.options.tls === "both") {
      client.serviceSocket = tls.connect(port, host, {
        rejectUnauthorized: client.options.rejectUnauthorized
      }, () => {
        client.writeBuffer();
      });
    } else {
      client.serviceSocket = new net.Socket();
      client.serviceSocket.connect(port, host, () => {
        client.writeBuffer();
      });
    }
    client.serviceSocket.on("data", data => {
      try {
        client.relaySocket.write(data);
      } catch (ex) {
      }
    });
    client.serviceSocket.on("error", hadError => {
      client.relaySocket.end();
    });
  };

  writeBuffer() {
    const client = this;
    client.bufferData = false;
    if (client.buffer.length > 0) {
      for (let i = 0; i < client.buffer.length; i++) {
        client.serviceSocket.write(client.buffer[i]);
      }
      client.buffer.length = 0;
    }
  };

}
