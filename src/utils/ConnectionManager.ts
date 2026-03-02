import { RevitClientConnection } from "./SocketClient.js";

/**
 * Connect to Revit client and execute operation
 * @param operation Operation function to execute after connection
 * @returns Result of the operation
 */
export async function withRevitConnection<T>(
  operation: (client: RevitClientConnection) => Promise<T>
): Promise<T> {
  const revitClient = new RevitClientConnection("localhost", 8080);

  try {
    // Connect to Revit client
    if (!revitClient.isConnected) {
      await new Promise<void>((resolve, reject) => {
        const onConnect = () => {
          revitClient.socket.removeListener("connect", onConnect);
          revitClient.socket.removeListener("error", onError);
          resolve();
        };

        const onError = (error: any) => {
          revitClient.socket.removeListener("connect", onConnect);
          revitClient.socket.removeListener("error", onError);
          reject(new Error("connect to revit client failed"));
        };

        revitClient.socket.on("connect", onConnect);
        revitClient.socket.on("error", onError);

        revitClient.connect();

        setTimeout(() => {
          revitClient.socket.removeListener("connect", onConnect);
          revitClient.socket.removeListener("error", onError);
          reject(new Error("Connection to Revit client timed out (5s)"));
        }, 5000);
      });
    }

    // Execute operation
    return await operation(revitClient);
  } finally {
    // Disconnect
    revitClient.disconnect();
  }
}
