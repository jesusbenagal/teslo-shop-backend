import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";

import { MessagesWsService } from "./messages-ws.service";
import { NewMessageDto } from "./dtos/new-message.dto";
import { JwtPayload } from "../auth/interfaces";

@WebSocketGateway({ cors: true })
export class MessagesWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService
  ) {}
  async handleConnection(client: Socket) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient(client, payload.id);
    } catch (error) {
      client.disconnect();
      return;
    }

    this.wss.emit(
      "clients-updated",
      this.messagesWsService.getConnectedClients()
    );
  }
  handleDisconnect(client: any) {
    this.messagesWsService.removeClient(client.id);

    this.wss.emit(
      "clients-updated",
      this.messagesWsService.getConnectedClients()
    );
  }

  @SubscribeMessage("message-from-client")
  onMessageFromClient(client: Socket, payload: NewMessageDto): void {
    //! Emite unicamente al cliente que envio el mensaje
    // client.emit("message-from-server", {
    //   fullName: "NestJS",
    //   message: payload.message || "No message provided",
    // });

    //! Emite a todos menos, al cliente que envio el mensaje
    // client.broadcast.emit("message-from-server", {
    //   fullName: "NestJS",
    //   message: payload.message || "No message provided",
    // });

    //! Emite a todos
    this.wss.emit("message-from-server", {
      fullName: this.messagesWsService.getUserFullName(client.id),
      message: payload.message || "No message provided",
    });
  }
}
