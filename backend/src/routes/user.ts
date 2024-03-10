import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign } from 'hono/jwt';
import { signinInput, signupInput } from '@kvejre95/blog-common';
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
const userRoute = new Hono<{Bindings:Bindings}>()

userRoute.post('/signup', async (c) => {
	
    const body = await c.req.json()
    const result: ParseResult = signupInput.safeParse(body)
    if (!result.success) {
        const errorMessage = result.error?.message;
        console.log(errorMessage);
      
        result.error?.issues.forEach(issue => {
          console.log(issue.message);
        });
        return c.json({err: errorMessage})
      } 
    else{
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL,
        }).$extends(withAccelerate())
        try{
            const user = await prisma.user.create({
                data:{
                    email:body.email,
                    name: body.name,
                    password: body.password
                }
            })
            const jwt = await sign({id : user.id},c.env.JWT_SECRET)

            return c.json({token: `Bearer ${jwt}`})
        }catch(e){
            c.status(411)
            return c.json({err: "Invalid Data"})
        }
    }
    
})

userRoute.post('/signin', async (c) => {
    
    const body = await c.req.json()
    const result: ParseResult = signinInput.safeParse(body)
    if (!result.success) {
        const errorMessage = result.error?.message;
        console.log(errorMessage);
      
        result.error?.issues.forEach(issue => {
          console.log(issue.message);
        });
        return c.json({err: errorMessage})
    } 
    else{
        const prisma = new PrismaClient({
            datasourceUrl:c.env.DATABASE_URL
        }).$extends(withAccelerate())
        try{
            const user = await prisma.user.findFirst({
                where:{
                    email: body.email,
                    password: body.password
                }
            })
            if (!user){
                c.status(403)
                return c.json({message: "Incorrect Credentials"})
            }
            const jwt = await sign({id:user.id}, c.env.JWT_SECRET)
            return c.json({token:`Bearer ${jwt}`})
        }catch(e){
            c.status(411)
            return c.json({err: "Invalid Inputs"})
        }
    }  
})

export default userRoute
