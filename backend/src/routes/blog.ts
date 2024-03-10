import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { verify } from 'hono/jwt';
import { Variables } from 'hono/types';
import { createBlogInput, updateBlogInput } from '@kvejre95/blog-common';
import {ZodError} from "zod"

type Bindings = {
	DATABASE_URL: string,
	JWT_SECRET: string
}
type ParseResult = {
    success: boolean;
    data?: any;
    error?: ZodError;
};
const blogRoute = new Hono<{Bindings:Bindings,Variables:{userId:string}}>()

blogRoute.use("/*",async (c, next)=>{
    const authHeader = await c.req.header("authorization");
    try {
        if (authHeader){
            const token = authHeader.split(" ")[1]
            const user = await verify(token,  c.env.JWT_SECRET)
            if(user){
                c.set("userId",     user.id)
                await next();
            }
        }else{
            return c.json({err: "Your session has expired."})
        }
    } catch (error) {
        return c.json({err: "Please Re-Login."})
    }    
    
})

blogRoute.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())
    const posts = await prisma.post.findMany()
    console.log(posts)
    return c.json(posts)
})

blogRoute.get('/get/:id', async (c) => {
	const id = c.req.param('id')
	console.log(id);
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())
    try{
        const post = await prisma.post.findFirst({
            where:{id:id}
        })
        return c.json({post:post})
    }catch(e){
        return c.json({err:"Some went wrong"})
    }
})

blogRoute.post('/', async (c) => {
    
    const body = await c.req.json()
    const result: ParseResult = createBlogInput.safeParse(body)
    if (!result.success) {
        const errorMessage = result.error?.message;
        console.log(errorMessage);
      
        result.error?.issues.forEach(issue => {
          console.log(issue.message);
        });
        return c.json({err: errorMessage})
    }else{
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        }).$extends(withAccelerate())
        try{
            const post = await prisma.post.create({
                data:{
                    title:body.title,
                    content: body.content,
                    authorId: c.get("userId")
                }
            })
            return c.json({id:post.id})
        }catch(e){
            return c.json({err:"Some went wrong"})
        }
    }    
})

blogRoute.put('/', async (c) => {
	
    const body = await c.req.json()
    const result: ParseResult = updateBlogInput.safeParse(body)
    if (!result.success) {
        const errorMessage = result.error?.message;
        console.log(errorMessage);
      
        result.error?.issues.forEach(issue => {
          console.log(issue.message);
        });
        return c.json({err: errorMessage})
    }else{
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL
        }).$extends(withAccelerate())
        try{
            const post = await prisma.post.update({
                where:{
                    id:body.id
                },
                data:{
                    title:body.title,
                    content: body.content,
                }
            })
            return c.json({id:post.id})
        }catch(e){
            return c.json({err:"Some went wrong"})
        }
    } 
    
})



export default blogRoute
