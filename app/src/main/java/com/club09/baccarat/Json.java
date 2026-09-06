package com.club09.baccarat;
import java.util.*;
/** Small bounded JSON codec shared by the Android server and JVM verification. */
final class Json {
 static Map<String,Object> obj(Object... kv){Map<String,Object> m=new LinkedHashMap<>();for(int i=0;i<kv.length;i+=2)m.put((String)kv[i],kv[i+1]);return m;}
 static String text(Object v){return v==null?"":v.toString();}
 static String encode(Object v){
  if(v==null)return "null";if(v instanceof Number||v instanceof Boolean)return v.toString();
  if(v instanceof Map){List<String> l=new ArrayList<>();for(Object en:((Map<?,?>)v).entrySet()){Map.Entry<?,?> e=(Map.Entry<?,?>)en;l.add(encode(e.getKey().toString())+":"+encode(e.getValue()));}return "{"+String.join(",",l)+"}";}
  if(v instanceof Iterable){List<String> l=new ArrayList<>();for(Object item:(Iterable<?>)v)l.add(encode(item));return "["+String.join(",",l)+"]";}
  StringBuilder b=new StringBuilder("\"");for(char c:v.toString().toCharArray()){switch(c){case '"':b.append("\\\"");break;case '\\':b.append("\\\\");break;case '\n':b.append("\\n");break;case '\r':b.append("\\r");break;case '\t':b.append("\\t");break;default:if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c);}}return b.append('"').toString();
 }
 static Map<String,Object> parseObject(String s){Parser p=new Parser(s);Object value=p.value(0);p.ws();if(p.i!=s.length()||!(value instanceof Map))throw new IllegalArgumentException("잘못된 JSON 요청입니다.");return (Map<String,Object>)value;}
 private static final class Parser {
  final String s;int i;Parser(String s){this.s=s;}void ws(){while(i<s.length()&&Character.isWhitespace(s.charAt(i)))i++;}
  IllegalArgumentException fail(){return new IllegalArgumentException("잘못된 JSON 요청입니다.");}
  Object value(int depth){if(depth>16)throw fail();ws();if(i>=s.length())throw fail();char c=s.charAt(i);
   if(c=='"')return string();
   if(c=='{'){i++;Map<String,Object> m=new LinkedHashMap<>();ws();if(take('}'))return m;do{ws();if(i>=s.length()||s.charAt(i)!='"')throw fail();String k=string();ws();if(!take(':'))throw fail();m.put(k,value(depth+1));ws();if(take('}'))return m;}while(take(','));throw fail();}
   if(c=='['){i++;List<Object> l=new ArrayList<>();ws();if(take(']'))return l;do{l.add(value(depth+1));ws();if(take(']'))return l;}while(take(','));throw fail();}
   if(s.startsWith("true",i)){i+=4;return true;}if(s.startsWith("false",i)){i+=5;return false;}if(s.startsWith("null",i)){i+=4;return null;}
   int start=i;if(c=='-')i++;while(i<s.length()&&Character.isDigit(s.charAt(i)))i++;if(i==start)throw fail();try{return Long.valueOf(s.substring(start,i));}catch(NumberFormatException e){throw fail();}
  }
  boolean take(char c){if(i<s.length()&&s.charAt(i)==c){i++;return true;}return false;}
  String string(){i++;StringBuilder b=new StringBuilder();while(i<s.length()){char c=s.charAt(i++);if(c=='"')return b.toString();if(c<32)throw fail();if(c=='\\'){if(i>=s.length())throw fail();c=s.charAt(i++);switch(c){case '"':case '\\':case '/':b.append(c);break;case 'n':b.append('\n');break;case 'r':b.append('\r');break;case 't':b.append('\t');break;case 'b':b.append('\b');break;case 'f':b.append('\f');break;case 'u':if(i+4>s.length())throw fail();try{b.append((char)Integer.parseInt(s.substring(i,i+4),16));}catch(NumberFormatException e){throw fail();}i+=4;break;default:throw fail();}}else b.append(c);}throw fail();}
 }
}
