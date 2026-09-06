package com.club09.baccarat;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
/** A bounded HTTP server owned by the host phone; no external service. */
final class LanServer implements Closeable {
 interface Assets { InputStream open(String name) throws IOException; }
 final Assets assets;final GameEngine game=new GameEngine();final ThreadPoolExecutor workers=new ThreadPoolExecutor(2,6,30,TimeUnit.SECONDS,new ArrayBlockingQueue<>(24));
 final Set<Socket> clients=Collections.synchronizedSet(new HashSet<>());volatile ServerSocket server;volatile boolean running;
 LanServer(Assets assets){this.assets=assets;}
 synchronized void start(boolean lan)throws IOException{if(running)return;server=new ServerSocket();server.setReuseAddress(true);server.bind(new InetSocketAddress(lan?"0.0.0.0":"127.0.0.1",8765));running=true;Thread t=new Thread(()->{while(running){try{Socket socket=server.accept();socket.setSoTimeout(5000);clients.add(socket);try{workers.execute(()->handle(socket));}catch(RejectedExecutionException e){clients.remove(socket);socket.close();}}catch(IOException e){if(running)close();}}},"baccarat-lan");t.setDaemon(true);t.start();}
 static String line(InputStream in)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();for(int n=0;n<4096;n++){int c=in.read();if(c==-1){if(n==0)return null;throw new EOFException();}if(c=='\n')return out.toString("UTF-8").replace("\r","");out.write(c);}throw new IOException("Header too long");}
 void handle(Socket socket){try(Socket s=socket){InputStream in=new BufferedInputStream(s.getInputStream());OutputStream out=s.getOutputStream();String first=line(in);if(first==null)return;String[] req=first.split(" ");if(req.length!=3){respond(out,400,"text/plain",bytes("Bad request"));return;}Map<String,String> headers=new HashMap<>();int total=0;while(true){String l=line(in);if(l==null)throw new EOFException();if(l.isEmpty())break;total+=l.length();if(total>16384)throw new IOException("Headers too long");int colon=l.indexOf(':');if(colon<1)throw new IOException("Invalid header");headers.put(l.substring(0,colon).trim().toLowerCase(Locale.ROOT),l.substring(colon+1).trim());}
  String path=req[1].split("\\?",2)[0];
  if(req[0].equals("GET")&&(path.equals("/")||path.equals("/table.png"))){String file=path.equals("/")?"index.html":"table.png";try(InputStream fileIn=assets.open(file)){ByteArrayOutputStream data=new ByteArrayOutputStream();byte[] buffer=new byte[16384];for(int n;(n=fileIn.read(buffer))!=-1;)data.write(buffer,0,n);respond(out,200,file.endsWith("png")?"image/png":"text/html; charset=utf-8",data.toByteArray());}return;}
  if(!req[0].equals("POST")||!path.equals("/api")){respond(out,404,"text/plain",bytes("Not found"));return;}
  if(headers.containsKey("transfer-encoding")){respond(out,400,"text/plain",bytes("Unsupported encoding"));return;}
  String origin=headers.get("origin");if(origin!=null&&!origin.equals("http://"+headers.get("host"))){respond(out,403,"application/json",bytes(Json.encode(Json.obj("error","다른 주소에서 보낸 요청입니다."))));return;}
  try{int length=Integer.parseInt(headers.getOrDefault("content-length","0"));if(length<1||length>4096)throw new IllegalArgumentException("요청이 너무 큽니다.");byte[] body=new byte[length];int offset=0;while(offset<length){int n=in.read(body,offset,length-offset);if(n<0)throw new EOFException();offset+=n;}Map<String,Object> result=game.action(Json.parseObject(new String(body,StandardCharsets.UTF_8)));respond(out,200,"application/json; charset=utf-8",bytes(Json.encode(result)));}
  catch(IllegalArgumentException|ClassCastException e){respond(out,400,"application/json; charset=utf-8",bytes(Json.encode(Json.obj("error",e.getMessage()==null?"잘못된 요청입니다.":e.getMessage()))));}
 }catch(IOException ignored){}finally{clients.remove(socket);}}
 static byte[] bytes(String s){return s.getBytes(StandardCharsets.UTF_8);}
 static void respond(OutputStream out,int code,String type,byte[] data)throws IOException{String status=code==200?"OK":code==404?"Not Found":code==403?"Forbidden":"Bad Request";out.write(bytes("HTTP/1.1 "+code+" "+status+"\r\nContent-Type: "+type+"\r\nContent-Length: "+data.length+"\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n"));out.write(data);out.flush();}
 public synchronized void close(){running=false;if(server!=null)try{server.close();}catch(IOException ignored){}synchronized(clients){for(Socket s:clients)try{s.close();}catch(IOException ignored){}clients.clear();}workers.shutdownNow();}
}
