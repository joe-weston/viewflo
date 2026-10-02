export function POST() {
 return Response.json({error:"The photo form has moved. Please reload the website and use the new photo request form."},{status:410,headers:{"Cache-Control":"no-store"}});
}
