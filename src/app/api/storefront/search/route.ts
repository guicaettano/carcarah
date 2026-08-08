import { NextResponse } from "next/server";
import { z } from "zod";
import { searchStorefront } from "../../../../lib/commerce-search";
export const runtime = "nodejs";
const ruleSchema=z.object({id:z.string().min(1).max(200),source:z.string().min(1).max(200),targets:z.array(z.string().min(1).max(200)).max(8),reversible:z.literal(true)}).strict();
const configSchema=z.object({synonymRules:z.array(ruleSchema).max(24),queryRewriteRules:z.array(ruleSchema).max(24)}).strict();
const requestSchema=z.object({query:z.string().trim().min(1).max(200),configuration:configSchema.nullable().optional()}).strict();
export async function POST(request:Request){let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"A busca precisa ser enviada como JSON válido."},{status:400})}const parsed=requestSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"A busca ou a configuração da demonstração é inválida."},{status:400});const {query,configuration}=parsed.data;const result=searchStorefront(query,undefined,configuration??undefined);return NextResponse.json({query:result.query,total:result.total,results:result.results.map(p=>({id:p.id,name:p.name,category:p.category,price:p.price,stock:p.stock}))})}
