package com.club09.baccarat;
import java.util.*;
import java.net.*;
import java.io.*;
import java.nio.file.*;
import static com.club09.baccarat.Json.*;
public class EngineTest {
 static int count;static void check(boolean ok){count++;if(!ok)throw new AssertionError("Check "+count);}
 static Map<String,Object> state(Map<String,Object> r){return (Map<String,Object>)r.get("state");}
 static void rejects(Runnable r){boolean rejected=false;try{r.run();}catch(IllegalArgumentException e){rejected=true;}check(rejected);}
 static Map<String,Object> request(int port,Map<String,Object> data)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL("http://127.0.0.1:"+port+"/api").openConnection();c.setConnectTimeout(2000);c.setReadTimeout(3000);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");try(OutputStream o=c.getOutputStream()){o.write(LanServer.bytes(encode(data)));}check(c.getResponseCode()==200);String body;try(InputStream in=c.getInputStream()){body=new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}c.disconnect();return parseObject(body);}
 public static void main(String[] args)throws Exception{
  check(encode(parseObject("{\"name\":\"테스트\\n♠\",\"amount\":10000,\"ok\":true}")).contains("테스트"));
  rejects(()->parseObject("{\"amount\":10000.5}"));
  for(int b=0;b<=7;b++)for(int t=0;t<=9;t++){boolean expected=b<3||b==3&&t!=8||b==4&&t>=2&&t<=7||b==5&&t>=4&&t<=7||b==6&&(t==6||t==7);check(GameEngine.bankerDraw(b,t)==expected);}
  check(GameEngine.payout("banker","banker",10000)==9500);check(GameEngine.payout("player","tie",10000)==0);check(GameEngine.payout("banker","tie",10000)==0);check(GameEngine.payout("tie","tie",10000)==80000);
  GameEngine g=new GameEngine();Map<String,Object> a=g.action(obj("op","create","solo",true));String code=(String)state(a).get("code"),token=(String)a.get("token");GameEngine.Room room=g.rooms.get(code);room.deck=new ArrayList<>();for(int i=0;i<24;i++)room.deck.add(new GameEngine.Card(4,"♠"));g.action(obj("op","bet","code",code,"token",token,"side","tie","amount",10000));check(room.phase.equals("result"));check(room.players.get(0).balance==1080000);check(((List<?>)room.result.get("player")).size()==2);check(((List<?>)room.result.get("banker")).size()==2);
  rejects(()->g.action(obj("op","bet","code",code,"token",token,"side","tie","amount",10000)));
  g.action(obj("op","next","code",code,"token",token,"round",1));rejects(()->g.action(obj("op","bet","code",code,"token",token,"side","player","amount",10000,"round",1)));rejects(()->g.action(obj("op","bet","code",code,"token",token,"side","player","amount",100)));
  room.players.get(0).balance=5000;room.phase="result";g.action(obj("op","next","code",code,"token",token));check(room.players.get(0).balance==1000000);
  try(LanServer server=new LanServer(file->Files.newInputStream(Path.of(args[0],file)))){server.start(false);Map<String,Object> host=request(8765,obj("op","create","name","호스트"));String c=(String)state(host).get("code");Map<String,Object> guest=request(8765,obj("op","join","name","친구","code",c));Map<String,Object> first=request(8765,obj("op","bet","code",c,"token",host.get("token"),"amount",50000,"side","player","round",1));check(state(first).get("phase").equals("betting"));Map<String,Object> result=request(8765,obj("op","bet","code",c,"token",guest.get("token"),"amount",10000,"side","banker","round",1));Map<String,Object> same=request(8765,obj("op","state","code",c,"token",host.get("token")));check(encode(state(result).get("result")).equals(encode(state(same).get("result"))));check(!encode(state(same).get("players")).contains((String)guest.get("token")));request(8765,obj("op","leave","code",c,"token",guest.get("token")));Map<String,Object> waiting=request(8765,obj("op","state","code",c,"token",host.get("token")));check(((List<?>)state(waiting).get("players")).size()==1);try(InputStream image=new URL("http://127.0.0.1:8765/table.png").openStream()){check(image.readAllBytes().length>1000);}}
  System.out.println("PASS: "+count+" checks (rules, payouts, rejoin state, real HTTP two-client synchronization)");
 }
}
