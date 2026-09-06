package com.club09.baccarat;
import java.util.*;
import java.security.SecureRandom;
import static com.club09.baccarat.Json.*;
final class GameEngine {
 static final long START=1000000,MIN=10000;
 final SecureRandom random=new SecureRandom();final Map<String,Room> rooms=new HashMap<>();
 static final class Card {final int rank;final String suit;Card(int r,String s){rank=r;suit=s;}int points(){return rank>=10?0:rank;}Map<String,Object> json(){return obj("rank",rank,"suit",suit);}}
 static final class Player {String id,name;boolean bot;long balance=START,delta,amount;String side;}
 static final class Room {String code;boolean solo;int round=1;String phase="betting";List<Player> players=new ArrayList<>();List<Card> deck;Map<String,Object> result;List<String> history=new ArrayList<>();}
 String token(){byte[] b=new byte[20];random.nextBytes(b);StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format("%02x",v&255));return s.toString();}
 Player player(Object raw,boolean bot){Player p=new Player();p.id=token();p.name=text(raw).trim();if(p.name.isEmpty())p.name="게스트";if(p.name.length()>16)p.name=p.name.substring(0,16);p.bot=bot;return p;}
 List<Card> shoe(){List<Card> d=new ArrayList<>();for(int n=0;n<8;n++)for(String s:new String[]{"♠","♥","♣","♦"})for(int r=1;r<=13;r++)d.add(new Card(r,s));Collections.shuffle(d,random);return d;}
 static int total(List<Card> cards){int sum=0;for(Card c:cards)sum+=c.points();return sum%10;}
 static boolean bankerDraw(int b,int t){return b<=2||(b==3&&t!=8)||(b==4&&t>=2&&t<=7)||(b==5&&t>=4&&t<=7)||(b==6&&(t==6||t==7));}
 static Card draw(List<Card> deck){return deck.remove(deck.size()-1);}
 static List<List<Card>> deal(List<Card> deck){List<Card> p=new ArrayList<>(),b=new ArrayList<>();p.add(draw(deck));b.add(draw(deck));p.add(draw(deck));b.add(draw(deck));if(Math.max(total(p),total(b))<8){if(total(p)<=5){Card third=draw(deck);p.add(third);if(bankerDraw(total(b),third.points()))b.add(draw(deck));}else if(total(b)<=5)b.add(draw(deck));}return Arrays.asList(p,b);}
 static List<Object> cardJson(List<Card> cards){List<Object> out=new ArrayList<>();for(Card c:cards)out.add(c.json());return out;}
 static long payout(String side,String winner,long amount){if(side.equals(winner))return side.equals("tie")?amount*8:side.equals("banker")?amount*95/100:amount;return winner.equals("tie")&&!side.equals("tie")?0:-amount;}
 void settle(Room r){if(r.players.size()!=2)return;for(Player p:r.players)if(p.side==null)return;if(r.deck.size()<20)r.deck=shoe();List<List<Card>> hands=deal(r.deck);int pt=total(hands.get(0)),bt=total(hands.get(1));String winner=pt==bt?"tie":pt>bt?"player":"banker";for(Player p:r.players){p.delta=payout(p.side,winner,p.amount);p.balance+=p.delta;}r.phase="result";r.result=obj("player",cardJson(hands.get(0)),"banker",cardJson(hands.get(1)),"pt",pt,"bt",bt,"winner",winner);r.history.add(winner);if(r.history.size()>60)r.history.remove(0);}
 Map<String,Object> view(Room r,String token){List<Object> players=new ArrayList<>();for(Player p:r.players)players.add(obj("name",p.name,"balance",p.balance,"bet",p.side==null?null:obj("amount",p.amount,"side",p.side),"delta",p.delta,"bot",p.bot,"you",p.id.equals(token)));return obj("code",r.code,"round",r.round,"phase",r.phase,"result",r.result,"history",new ArrayList<>(r.history),"solo",r.solo,"remaining",r.deck.size(),"you",token,"players",players);}
 static void require(boolean ok,String error){if(!ok)throw new IllegalArgumentException(error);}
 synchronized Map<String,Object> action(Map<String,Object> data){String op=text(data.get("op"));
  if(op.equals("create")){require(rooms.size()<30,"방이 가득 찼습니다. 앱 홈에서 다시 시작하세요.");Room r=new Room();do{r.code=Integer.toString(100000+random.nextInt(900000));}while(rooms.containsKey(r.code));r.solo=Boolean.TRUE.equals(data.get("solo"));r.deck=shoe();Player p=player(data.get("name"),false);r.players.add(p);if(r.solo)r.players.add(player("하우스 봇",true));rooms.put(r.code,r);return obj("token",p.id,"state",view(r,p.id));}
  Room r=rooms.get(text(data.get("code")));require(r!=null,"방을 찾을 수 없습니다. 새 방 코드를 확인하세요.");
  if(op.equals("join")){require(r.players.size()<2,"이미 두 명이 있는 방입니다.");Player p=player(data.get("name"),false);r.players.add(p);return obj("token",p.id,"state",view(r,p.id));}
  Player me=null;for(Player p:r.players)if(p.id.equals(data.get("token")))me=p;require(me!=null,"접속 정보가 없습니다. 방에 다시 들어가세요.");
  if(op.equals("bet")){require(r.phase.equals("betting")&&me.side==null,"이미 베팅을 확정했습니다.");require(r.players.size()==2,"상대방이 입장하면 베팅할 수 있습니다.");Object raw=data.get("amount");require(raw instanceof Long||raw instanceof Integer,"1만 칩 단위로 입력하세요.");long amount=((Number)raw).longValue();String side=text(data.get("side"));require(amount>=MIN&&amount%MIN==0&&amount<=me.balance&&amount<=Long.MAX_VALUE/100&&Arrays.asList("player","banker","tie").contains(side),"보유 칩 이내에서 1만 칩 단위로 선택하세요.");if(data.containsKey("round"))require(((Number)data.get("round")).intValue()==r.round,"라운드가 바뀌었습니다. 다시 선택하세요.");me.amount=amount;me.side=side;for(Player p:r.players)if(p.bot){p.amount=Math.min(50000,p.balance/MIN*MIN);p.side=random.nextBoolean()?"player":"banker";}settle(r);}
  else if(op.equals("next")){require(r.phase.equals("result"),"아직 라운드가 끝나지 않았습니다.");if(data.containsKey("round"))require(((Number)data.get("round")).intValue()==r.round,"이미 다음 라운드로 이동했습니다.");r.round++;r.phase="betting";r.result=null;for(Player p:r.players){p.side=null;p.amount=0;p.delta=0;if(p.balance<MIN)p.balance=START;}}
  else if(op.equals("leave")){r.players.remove(me);for(Player p:r.players){p.side=null;p.amount=0;}r.phase="betting";r.result=null;if(r.solo||r.players.isEmpty())rooms.remove(r.code);return obj("ok",true);}
  else require(op.equals("state"),"지원하지 않는 요청입니다.");
  return obj("state",view(r,me.id));
 }
}
